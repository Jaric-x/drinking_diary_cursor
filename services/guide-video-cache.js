/**
 * 引导视频预缓存服务
 * 支持 cloud:// fileID 转可播放地址，并预下载到本地临时路径
 */

const memoryCache = {};

function isCloudFileId(path) {
  return typeof path === 'string' && path.startsWith('cloud://');
}

function getTempUrlFromCloud(fileID) {
  return new Promise((resolve, reject) => {
    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: (res) => {
        const item = (res.fileList || [])[0];
        if (!item) {
          reject(new Error('云端返回为空'));
          return;
        }

        // 兼容不同基础库字段
        const tempUrl = item.tempFileURL || item.tempFileUrl || item.download_url || '';
        if (tempUrl) {
          resolve(tempUrl);
          return;
        }

        const code = item.status !== undefined ? `status=${item.status}` : '';
        const msg = item.errMsg || item.errmsg || '';
        reject(new Error(`获取临时链接失败 ${code} ${msg}`.trim()));
      },
      fail: reject
    });
  });
}

function getTempUrlsFromCloudFunction(fileIDs = []) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'getGuideVideoUrls',
      data: { fileIDs },
      success: (res) => {
        const result = res && res.result ? res.result : {};
        if (!result.success) {
          reject(new Error(result.error || '云函数返回失败'));
          return;
        }
        resolve(result.fileList || []);
      },
      fail: reject
    });
  });
}

function downloadCloudFile(fileID) {
  return new Promise((resolve, reject) => {
    wx.cloud.downloadFile({
      fileID,
      success: (res) => {
        if (res && res.tempFilePath) {
          resolve(res.tempFilePath);
          return;
        }
        reject(new Error('云文件下载无可用路径'));
      },
      fail: reject
    });
  });
}

function downloadToTempFile(url) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode === 200 && res.tempFilePath) {
          resolve(res.tempFilePath);
          return;
        }
        reject(new Error(`下载失败: ${res.statusCode}`));
      },
      fail: reject
    });
  });
}

async function resolvePlayableSource(source) {
  if (!source) {
    return { source: '', tempUrl: '', tempFilePath: '' };
  }

  if (!isCloudFileId(source)) {
    return { source, tempUrl: source, tempFilePath: '' };
  }

  // 单文件兜底：先尝试客户端直下，再尝试客户端临时链接
  // 主流程在 prepareGuideVideos 里走云函数批量拿链接
  let tempUrl = '';
  try {
    const tempFilePath = await downloadCloudFile(source);
    return { source, tempUrl: '', tempFilePath };
  } catch (err) {
    console.warn('[GuideVideoCache] 直接下载 cloud 文件失败，尝试临时链接:', err);
  }

  tempUrl = await getTempUrlFromCloud(source);
  let tempFilePath = '';
  try {
    tempFilePath = await downloadToTempFile(tempUrl);
  } catch (err) {
    console.warn('[GuideVideoCache] 预下载失败，回退临时链接播放:', err);
  }

  return {
    source,
    tempUrl,
    tempFilePath
  };
}

async function prepareGuideVideos(sources = []) {
  // 主路径：通过云函数（服务端权限）获取临时链接，规避 STORAGE_EXCEED_AUTHORITY
  try {
    const fileList = await getTempUrlsFromCloudFunction(sources);
    const byFileId = {};
    fileList.forEach((item) => {
      if (item && item.fileID) {
        byFileId[item.fileID] = item;
      }
    });

    const result = await Promise.all(
      sources.map(async (source) => {
        try {
          const item = byFileId[source] || {};
          const tempUrl = item.tempFileURL || item.tempFileUrl || item.download_url || '';
          if (!tempUrl) {
            const code = item.status !== undefined ? `status=${item.status}` : '';
            const msg = item.errMsg || item.errmsg || '';
            throw new Error(`云函数返回链接为空 ${code} ${msg}`.trim());
          }

          let tempFilePath = '';
          try {
            tempFilePath = await downloadToTempFile(tempUrl);
          } catch (err) {
            console.warn('[GuideVideoCache] 通过云函数拿到链接但预下载失败，回退链接直播:', err);
          }

          memoryCache[source] = { source, tempUrl, tempFilePath };
          return memoryCache[source];
        } catch (err) {
          console.error('[GuideVideoCache] 处理引导视频失败:', source, err);
          memoryCache[source] = { source, tempUrl: '', tempFilePath: '' };
          return memoryCache[source];
        }
      })
    );

    return result;
  } catch (err) {
    console.warn('[GuideVideoCache] 云函数获取临时链接失败，走客户端兜底链路:', err);
    const fallbackResult = await Promise.all(
      sources.map(async (source) => {
        try {
          const playable = await resolvePlayableSource(source);
          memoryCache[source] = playable;
          return playable;
        } catch (sourceErr) {
          console.error('[GuideVideoCache] 处理引导视频失败:', source, sourceErr);
          memoryCache[source] = { source, tempUrl: '', tempFilePath: '' };
          return memoryCache[source];
        }
      })
    );
    return fallbackResult;
  }
}

function getPlayableSource(source) {
  const item = memoryCache[source];
  if (!item) return '';
  if (item.tempFilePath) return item.tempFilePath;
  if (item.tempUrl) return item.tempUrl;
  // cloud:// 不能直接给 video 组件播放
  if (isCloudFileId(item.source)) return '';
  return item.source || '';
}

module.exports = {
  prepareGuideVideos,
  getPlayableSource
};

