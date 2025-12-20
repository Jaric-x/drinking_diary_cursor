/**
 * 云端数据服务层
 * 管理笔记数据的云端备份、恢复和删除
 */

const db = wx.cloud.database();
const notesCollection = db.collection('notes');
const userService = require('./user.js');
const util = require('./util.js');

/**
 * 备份笔记到云端
 * @param {Array} notes - 本地笔记数据
 * @returns {Promise<Object>} 备份结果
 */
async function backupNotes(notes) {
  try {
    console.log('[CloudService] 开始备份笔记到云端...');
    
    const userInfo = userService.getUserInfo();
    if (!userInfo) {
      throw new Error('未登录');
    }
    
    if (!notes || notes.length === 0) {
      console.log('[CloudService] 没有笔记需要备份');
      return { success: true, count: 0 };
    }
    
    // 处理笔记数据 - 上传图片到云存储
    const processedNotes = [];
    for (const note of notes) {
      try {
        const processedNote = await processNoteForBackup(note, userInfo.openid);
        processedNotes.push(processedNote);
      } catch (err) {
        console.error('[CloudService] 处理笔记失败:', note.id, err);
        // 继续处理其他笔记
      }
    }
    
    console.log('[CloudService] 笔记处理完成，共', processedNotes.length, '条');
    
    // 批量保存到云数据库 (使用事务或逐条 upsert)
    let successCount = 0;
    for (const note of processedNotes) {
      try {
        // 尝试更新，如果不存在则插入
        const checkResult = await notesCollection
          .where({
            _openid: userInfo.openid,
            noteId: note.noteId
          })
          .get();
        
        if (checkResult.data.length > 0) {
          // 更新现有记录
          await notesCollection.doc(checkResult.data[0]._id).update({
            data: {
              name: note.name,
              location: note.location,
              tags: note.tags,
              rating: note.rating,
              price: note.price,
              notes: note.notes,
              imagePath: note.imagePath,
              createTime: note.createTime,
              dateString: note.dateString,
              timeString: note.timeString,
              date: note.date,
              updatedAt: db.serverDate()
            }
          });
          console.log('[CloudService] 更新笔记:', note.noteId);
        } else {
          // 插入新记录
          await notesCollection.add({
            data: note
          });
          console.log('[CloudService] 新增笔记:', note.noteId);
        }
        successCount++;
      } catch (err) {
        console.error('[CloudService] 保存笔记失败:', note.noteId, err);
      }
    }
    
    // 更新用户的最后备份时间
    await updateLastBackupTime(userInfo.openid);
    
    console.log('[CloudService] 备份完成，成功', successCount, '条');
    return { 
      success: true, 
      count: successCount,
      total: processedNotes.length 
    };
    
  } catch (err) {
    console.error('[CloudService] 备份失败:', err);
    throw err;
  }
}

/**
 * 处理单条笔记用于备份 - 上传图片到云存储
 * @param {Object} note - 笔记对象
 * @param {String} openid - 用户 OpenID
 * @returns {Promise<Object>} 处理后的笔记
 */
async function processNoteForBackup(note, openid) {
  const processedNote = {
    noteId: note.id, // 使用 noteId 存储本地 id
    name: note.name || '', // 笔记名称
    location: note.location || '', // 地点
    tags: note.tags || [], // 标签数组
    rating: note.rating || 0,
    price: note.price || 0,
    notes: note.notes || '',
    imagePath: note.imagePath || note.imageUrl || '',
    // 保留原始创建时间信息
    createTime: note.createTime || Date.now(), // 创建时间戳
    dateString: note.dateString || '', // 日期字符串
    timeString: note.timeString || '', // 时间字符串
    date: note.date || (note.createTime ? new Date(note.createTime).toISOString() : new Date().toISOString()), // ISO 日期字符串（兼容）
    createdAt: db.serverDate()
  };
  
  // 如果有图片路径，且是本地路径，需要上传到云存储
  if (processedNote.imagePath && isLocalPath(processedNote.imagePath)) {
    try {
      console.log('[CloudService] 上传图片:', processedNote.imagePath);
      
      const cloudPath = `images/${openid}/${note.id}_${Date.now()}.jpg`;
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: processedNote.imagePath
      });
      
      processedNote.imagePath = uploadResult.fileID;
      console.log('[CloudService] 图片上传成功:', uploadResult.fileID);
    } catch (err) {
      console.error('[CloudService] 图片上传失败:', err);
      // 图片上传失败，保留原路径
    }
  }
  
  return processedNote;
}

/**
 * 判断是否为本地路径
 * @param {String} path - 文件路径
 * @returns {Boolean}
 */
function isLocalPath(path) {
  if (!path) return false;
  // 本地临时文件路径通常以 wxfile:// 或 http://tmp/ 开头
  // 云存储路径以 cloud:// 开头
  return !path.startsWith('cloud://') && 
         !path.startsWith('http://') && 
         !path.startsWith('https://');
}

/**
 * 从云端恢复笔记
 * @returns {Promise<Array>} 恢复的笔记数据
 */
async function restoreNotes() {
  try {
    console.log('[CloudService] 开始从云端恢复笔记...');
    
    const userInfo = userService.getUserInfo();
    if (!userInfo) {
      throw new Error('未登录');
    }
    
    // 从云数据库获取用户的所有笔记
    const result = await notesCollection
      .where({
        _openid: userInfo.openid
      })
      .get();
    
    console.log('[CloudService] 获取到', result.data.length, '条笔记');
    
    if (result.data.length === 0) {
      return [];
    }
    
    // 转换为本地格式
    const localNotes = result.data.map(note => {
      // 优先使用备份的 createTime，如果没有则从 date 生成
      const createTime = note.createTime || (note.date ? new Date(note.date).getTime() : Date.now());
      
      // 如果 dateString 或 timeString 不存在，从 createTime 生成
      const dateString = note.dateString || util.formatDate(createTime);
      const timeString = note.timeString || util.formatTime(createTime);
      
      return {
        id: note.noteId,
        name: note.name || '', // 笔记名称
        location: note.location || '', // 地点
        tags: note.tags || [], // 标签数组
        rating: note.rating || 0,
        price: note.price || 0,
        notes: note.notes || '',
        imagePath: note.imagePath || '',
        imageUrl: note.imagePath || '', // 兼容性字段
        // 保留原始创建时间信息
        createTime: createTime, // 使用备份的原始创建时间
        dateString: dateString, // 日期字符串（优先使用备份的，否则生成）
        timeString: timeString, // 时间字符串（优先使用备份的，否则生成）
        date: note.date || new Date(createTime).toISOString(), // ISO 日期字符串（兼容）
        openid: userInfo.openid // 关联用户
      };
    });
    
    console.log('[CloudService] 恢复完成');
    return localNotes;
    
  } catch (err) {
    console.error('[CloudService] 恢复失败:', err);
    throw err;
  }
}

/**
 * 删除云端所有备份
 * @returns {Promise<Object>} 删除结果
 */
async function deleteCloudBackup() {
  try {
    console.log('[CloudService] 开始删除云端备份...');
    
    const userInfo = userService.getUserInfo();
    if (!userInfo) {
      throw new Error('未登录');
    }
    
    // 获取用户的所有笔记（用于删除关联的图片）
    const result = await notesCollection
      .where({
        _openid: userInfo.openid
      })
      .get();
    
    console.log('[CloudService] 找到', result.data.length, '条笔记');
    
    // 删除云存储中的图片
    const imageFileIDs = result.data
      .map(note => note.imagePath)
      .filter(path => path && path.startsWith('cloud://'));
    
    if (imageFileIDs.length > 0) {
      try {
        await wx.cloud.deleteFile({
          fileList: imageFileIDs
        });
        console.log('[CloudService] 删除图片成功:', imageFileIDs.length, '张');
      } catch (err) {
        console.warn('[CloudService] 删除图片失败:', err);
      }
    }
    
    // 删除云数据库中的笔记记录
    const deletePromises = result.data.map(note => 
      notesCollection.doc(note._id).remove()
    );
    
    await Promise.all(deletePromises);
    
    // 清除用户的最后备份时间
    await updateLastBackupTime(userInfo.openid, null);
    
    console.log('[CloudService] 删除完成');
    return { 
      success: true, 
      deletedCount: result.data.length 
    };
    
  } catch (err) {
    console.error('[CloudService] 删除失败:', err);
    throw err;
  }
}

/**
 * 获取最后备份时间
 * @returns {Promise<Date|null>} 最后备份时间
 */
async function getLastBackupTime() {
  try {
    const userInfo = userService.getUserInfo();
    if (!userInfo) {
      return null;
    }
    
    const usersCollection = db.collection('users');
    const result = await usersCollection.doc(userInfo.openid).get();
    
    if (result.data && result.data.lastBackupAt) {
      return result.data.lastBackupAt;
    }
    
    return null;
  } catch (err) {
    console.error('[CloudService] 获取最后备份时间失败:', err);
    return null;
  }
}

/**
 * 更新最后备份时间
 * @param {String} openid - 用户 OpenID
 * @param {Date|null} time - 备份时间，null 表示清除
 * @returns {Promise<void>}
 */
async function updateLastBackupTime(openid, time = undefined) {
  try {
    const usersCollection = db.collection('users');
    const updateData = {
      lastBackupAt: time === null ? null : (time || db.serverDate())
    };
    
    await usersCollection.doc(openid).update({
      data: updateData
    });
    
    console.log('[CloudService] 更新最后备份时间成功');
  } catch (err) {
    console.error('[CloudService] 更新最后备份时间失败:', err);
  }
}

module.exports = {
  backupNotes,
  restoreNotes,
  deleteCloudBackup,
  getLastBackupTime
};
