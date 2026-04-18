/**
 * 新手引导状态服务
 * 负责判断是否展示引导、记录完成/跳过状态
 */

const STORAGE_KEY = 'onboarding_state_v1';

function getScopeKey() {
  try {
    const userInfo = wx.getStorageSync('user_info');
    if (userInfo && userInfo.openid) {
      return `user:${userInfo.openid}`;
    }
  } catch (err) {
    console.warn('[OnboardingService] 读取用户信息失败:', err);
  }
  return 'device:guest';
}

function getAllState() {
  try {
    const value = wx.getStorageSync(STORAGE_KEY);
    return value && typeof value === 'object' ? value : {};
  } catch (err) {
    console.error('[OnboardingService] 读取引导状态失败:', err);
    return {};
  }
}

function getState() {
  const allState = getAllState();
  const scopeKey = getScopeKey();
  return allState[scopeKey] || {
    onboardingCompleted: false,
    onboardingFinishType: '',
    completedAt: 0
  };
}

function isNewUser() {
  const state = getState();
  return !state.onboardingCompleted;
}

function markCompleted(finishType = 'completed') {
  const allState = getAllState();
  const scopeKey = getScopeKey();
  allState[scopeKey] = {
    onboardingCompleted: true,
    onboardingFinishType: finishType,
    completedAt: Date.now()
  };
  wx.setStorageSync(STORAGE_KEY, allState);
}

module.exports = {
  isNewUser,
  markCompleted,
  getState
};

