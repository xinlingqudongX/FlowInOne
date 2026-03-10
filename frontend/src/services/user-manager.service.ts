import type { UserInfo } from './collaboration.service';

/**
 * 用户配置
 */
export interface UserConfig extends UserInfo {
  avatar?: string;
  preferences?: {
    cursorColor?: string;
    showCursor?: boolean;
    showUserNames?: boolean;
  };
}

/**
 * 用户管理服务
 * 负责用户身份信息的本地存储和管理
 */
export class UserManagerService {
  private static readonly STORAGE_KEY = 'flowinone_user_config';
  private static readonly DEFAULT_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];

  private currentUser: UserConfig | null = null;

  constructor() {
    this.loadUserConfig();
  }

  /**
   * 获取或创建用户信息
   */
  private ensureUserInfo(): UserConfig {
    if (!this.currentUser) {
      this.currentUser = this.generateDefaultUser();
      this.saveUserConfig();
    }
    
    // 确保用户ID存在且不为空
    if (!this.currentUser.userId || this.currentUser.userId.trim() === '') {
      this.currentUser.userId = this.generateUserId();
      this.saveUserConfig();
    }
    
    return this.currentUser;
  }

  /**
   * 获取当前用户信息
   */
  getCurrentUser(): UserConfig | null {
    return this.ensureUserInfo();
  }

  /**
   * 设置用户信息
   */
  setUserInfo(userInfo: Partial<UserConfig>): UserConfig {
    const existingUser = this.currentUser || this.generateDefaultUser();
    
    this.currentUser = {
      ...existingUser,
      ...userInfo,
      // 确保必需字段存在
      userId: userInfo.userId || existingUser.userId,
      displayName: userInfo.displayName || existingUser.displayName,
      color: userInfo.color || existingUser.color,
    };

    this.saveUserConfig();
    return this.currentUser;
  }

  /**
   * 更新用户显示名称
   */
  updateDisplayName(displayName: string): UserConfig {
    if (!displayName.trim()) {
      throw new Error('显示名称不能为空');
    }

    return this.setUserInfo({ displayName: displayName.trim() });
  }

  /**
   * 更新用户颜色
   */
  updateUserColor(color: string): UserConfig {
    if (!this.isValidColor(color)) {
      throw new Error('无效的颜色值');
    }

    return this.setUserInfo({ color });
  }

  /**
   * 更新用户偏好设置
   */
  updatePreferences(preferences: Partial<UserConfig['preferences']>): UserConfig {
    const currentPreferences = this.currentUser?.preferences || {};
    
    return this.setUserInfo({
      preferences: {
        ...currentPreferences,
        ...preferences,
      },
    });
  }

  /**
   * 获取随机颜色
   */
  getRandomColor(): string {
    const colors = UserManagerService.DEFAULT_COLORS;
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex] || '#FF6B6B';
  }

  /**
   * 获取可用颜色列表
   */
  getAvailableColors(): string[] {
    return [...UserManagerService.DEFAULT_COLORS];
  }

  /**
   * 重置用户配置
   */
  resetUserConfig(): UserConfig {
    this.currentUser = this.generateDefaultUser();
    this.saveUserConfig();
    return this.currentUser;
  }

  /**
   * 验证用户信息是否完整
   */
  validateUserInfo(userInfo: Partial<UserConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!userInfo.userId || !userInfo.userId.trim()) {
      errors.push('用户ID不能为空');
    }

    if (!userInfo.displayName || !userInfo.displayName.trim()) {
      errors.push('显示名称不能为空');
    }

    if (userInfo.displayName && userInfo.displayName.length > 50) {
      errors.push('显示名称不能超过50个字符');
    }

    if (userInfo.color && !this.isValidColor(userInfo.color)) {
      errors.push('无效的颜色值');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 导出用户配置
   */
  exportUserConfig(): string {
    return JSON.stringify(this.currentUser, null, 2);
  }

  /**
   * 导入用户配置
   */
  importUserConfig(configJson: string): UserConfig {
    try {
      const config = JSON.parse(configJson);
      const validation = this.validateUserInfo(config);
      
      if (!validation.valid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }

      return this.setUserInfo(config);
    } catch (error) {
      throw new Error(`导入配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成默认用户
   */
  private generateDefaultUser(): UserConfig {
    const userId = this.generateUserId();
    const displayName = this.generateDefaultDisplayName();
    const color = this.getRandomColor();

    return {
      userId,
      displayName,
      color,
      preferences: {
        cursorColor: color,
        showCursor: true,
        showUserNames: true,
      },
    };
  }

  /**
   * 生成用户ID
   */
  private generateUserId(): string {
    // 使用时间戳和随机数生成唯一ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `user_${timestamp}_${random}`;
  }

  /**
   * 生成默认显示名称
   */
  private generateDefaultDisplayName(): string {
    const adjectives = ['聪明的', '勤奋的', '创新的', '专注的', '高效的', '灵活的'];
    const nouns = ['开发者', '设计师', '架构师', '工程师', '创作者', '协作者'];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adjective}${noun}`;
  }

  /**
   * 验证颜色值
   */
  private isValidColor(color: string): boolean {
    // 检查十六进制颜色格式
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexPattern.test(color)) {
      return true;
    }

    // 检查是否在预定义颜色列表中
    return UserManagerService.DEFAULT_COLORS.includes(color);
  }

  /**
   * 从本地存储加载用户配置
   */
  private loadUserConfig(): void {
    try {
      const stored = localStorage.getItem(UserManagerService.STORAGE_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        const validation = this.validateUserInfo(config);
        
        if (validation.valid) {
          this.currentUser = config;
          return;
        } else {
          console.warn('存储的用户配置无效，将生成新配置:', validation.errors);
        }
      }
    } catch (error) {
      console.error('加载用户配置失败:', error);
    }

    // 如果加载失败或配置无效，生成默认用户
    this.currentUser = this.generateDefaultUser();
    this.saveUserConfig();
  }

  /**
   * 保存用户配置到本地存储
   */
  private saveUserConfig(): void {
    try {
      if (this.currentUser) {
        localStorage.setItem(
          UserManagerService.STORAGE_KEY,
          JSON.stringify(this.currentUser)
        );
      }
    } catch (error) {
      console.error('保存用户配置失败:', error);
    }
  }

  /**
   * 清除本地存储的用户配置
   */
  clearStoredConfig(): void {
    try {
      localStorage.removeItem(UserManagerService.STORAGE_KEY);
    } catch (error) {
      console.error('清除用户配置失败:', error);
    }
  }

  /**
   * 获取用户统计信息
   */
  getUserStats(): {
    hasStoredConfig: boolean;
    configSize: number;
    lastModified?: Date;
  } {
    try {
      const stored = localStorage.getItem(UserManagerService.STORAGE_KEY);
      return {
        hasStoredConfig: !!stored,
        configSize: stored ? stored.length : 0,
        lastModified: this.currentUser ? new Date() : undefined,
      };
    } catch (error) {
      return {
        hasStoredConfig: false,
        configSize: 0,
      };
    }
  }
}