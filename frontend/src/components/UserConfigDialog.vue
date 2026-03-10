<template>
  <div v-if="visible" class="user-config-overlay" @click="handleOverlayClick">
    <div class="user-config-dialog" @click.stop>
      <div class="dialog-header">
        <h3>用户设置</h3>
        <button class="close-btn" @click="close">✕</button>
      </div>

      <div class="dialog-content">
        <div class="form-section">
          <label class="form-label">显示名称</label>
          <input
            v-model="formData.displayName"
            type="text"
            class="form-input"
            placeholder="请输入您的显示名称"
            maxlength="50"
            @input="validateForm"
          />
          <div class="form-hint">其他用户将看到此名称</div>
        </div>

        <div class="form-section">
          <label class="form-label">光标颜色</label>
          <div class="color-picker">
            <div class="color-options">
              <button
                v-for="color in availableColors"
                :key="color"
                class="color-option"
                :class="{ active: formData.color === color }"
                :style="{ backgroundColor: color }"
                @click="selectColor(color)"
                :title="color"
              ></button>
            </div>
            <div class="custom-color">
              <input
                v-model="formData.color"
                type="color"
                class="color-input"
                @change="validateForm"
              />
              <span class="color-value">{{ formData.color }}</span>
            </div>
          </div>
        </div>

        <div class="form-section">
          <label class="form-label">协同偏好</label>
          <div class="preferences">
            <label class="checkbox-label">
              <input
                v-model="formData.preferences!.showCursor"
                type="checkbox"
                class="checkbox"
              />
              <span class="checkbox-text">显示我的光标给其他用户</span>
            </label>
            <label class="checkbox-label">
              <input
                v-model="formData.preferences!.showUserNames"
                type="checkbox"
                class="checkbox"
              />
              <span class="checkbox-text">显示其他用户的名称</span>
            </label>
          </div>
        </div>

        <div class="form-section">
          <label class="form-label">用户ID</label>
          <div class="user-id-display">
            <code>{{ formData.userId }}</code>
            <button class="copy-btn" @click="copyUserId" :title="copyTooltip">
              {{ copyTooltip }}
            </button>
          </div>
          <div class="form-hint">系统自动生成，用于识别您的身份</div>
        </div>

        <div v-if="errors.length > 0" class="error-section">
          <div class="error-title">请修正以下错误：</div>
          <ul class="error-list">
            <li v-for="error in errors" :key="error" class="error-item">
              {{ error }}
            </li>
          </ul>
        </div>
      </div>

      <div class="dialog-footer">
        <div class="footer-actions">
          <button class="btn btn-secondary" @click="resetToDefault">
            重置默认
          </button>
          <button class="btn btn-info" @click="exportConfig">
            导出配置
          </button>
          <button class="btn btn-info" @click="showImportDialog">
            导入配置
          </button>
        </div>
        <div class="footer-main">
          <button class="btn btn-secondary" @click="close">
            取消
          </button>
          <button
            class="btn btn-primary"
            @click="save"
            :disabled="!isValid || saving"
          >
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 导入配置对话框 -->
    <div v-if="showImport" class="import-dialog" @click.stop>
      <div class="dialog-header">
        <h4>导入用户配置</h4>
        <button class="close-btn" @click="hideImportDialog">✕</button>
      </div>
      <div class="dialog-content">
        <textarea
          v-model="importData"
          class="import-textarea"
          placeholder="请粘贴用户配置JSON数据..."
        ></textarea>
        <div v-if="importError" class="error-text">{{ importError }}</div>
      </div>
      <div class="dialog-footer">
        <button class="btn btn-secondary" @click="hideImportDialog">
          取消
        </button>
        <button
          class="btn btn-primary"
          @click="importConfig"
          :disabled="!importData.trim()"
        >
          导入
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { UserManagerService } from '../services/user-manager.service';
import type { UserConfig } from '../services/user-manager.service';

interface Props {
  visible: boolean;
  userManager: UserManagerService;
}

interface Emits {
  (e: 'close'): void;
  (e: 'save', userConfig: UserConfig): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 表单数据
const formData = reactive<UserConfig>({
  userId: '',
  displayName: '',
  color: '#FF6B6B',
  preferences: {
    showCursor: true,
    showUserNames: true,
  },
});

// 状态
const saving = ref(false);
const errors = ref<string[]>([]);
const availableColors = ref<string[]>([]);
const copyTooltip = ref('复制');

// 导入对话框
const showImport = ref(false);
const importData = ref('');
const importError = ref('');

// 计算属性
const isValid = computed(() => errors.value.length === 0);

// 监听props变化
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadUserConfig();
      loadAvailableColors();
    }
  },
  { immediate: true }
);

/**
 * 加载用户配置
 */
function loadUserConfig(): void {
  const currentUser = props.userManager.getCurrentUser();
  if (currentUser) {
    Object.assign(formData, {
      ...currentUser,
      preferences: {
        showCursor: true,
        showUserNames: true,
        ...currentUser.preferences,
      },
    });
  }
  validateForm();
}

/**
 * 加载可用颜色
 */
function loadAvailableColors(): void {
  availableColors.value = props.userManager.getAvailableColors();
}

/**
 * 验证表单
 */
function validateForm(): void {
  const validation = props.userManager.validateUserInfo(formData);
  errors.value = validation.errors;
}

/**
 * 选择颜色
 */
function selectColor(color: string): void {
  formData.color = color;
  if (formData.preferences) {
    formData.preferences.cursorColor = color;
  }
  validateForm();
}

/**
 * 复制用户ID
 */
async function copyUserId(): Promise<void> {
  try {
    await navigator.clipboard.writeText(formData.userId);
    copyTooltip.value = '已复制';
    setTimeout(() => {
      copyTooltip.value = '复制';
    }, 2000);
  } catch (error) {
    console.error('复制失败:', error);
    copyTooltip.value = '复制失败';
    setTimeout(() => {
      copyTooltip.value = '复制';
    }, 2000);
  }
}

/**
 * 重置为默认配置
 */
function resetToDefault(): void {
  if (confirm('确定要重置为默认配置吗？这将清除所有自定义设置。')) {
    const defaultUser = props.userManager.resetUserConfig();
    Object.assign(formData, defaultUser);
    validateForm();
  }
}

/**
 * 导出配置
 */
function exportConfig(): void {
  try {
    const configJson = props.userManager.exportUserConfig();
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowinone-user-config-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出配置失败:', error);
    alert('导出配置失败，请稍后重试');
  }
}

/**
 * 显示导入对话框
 */
function showImportDialog(): void {
  showImport.value = true;
  importData.value = '';
  importError.value = '';
}

/**
 * 隐藏导入对话框
 */
function hideImportDialog(): void {
  showImport.value = false;
  importData.value = '';
  importError.value = '';
}

/**
 * 导入配置
 */
function importConfig(): void {
  try {
    importError.value = '';
    const importedUser = props.userManager.importUserConfig(importData.value);
    Object.assign(formData, importedUser);
    validateForm();
    hideImportDialog();
  } catch (error) {
    importError.value = error instanceof Error ? error.message : '导入失败';
  }
}

/**
 * 保存配置
 */
async function save(): Promise<void> {
  if (!isValid.value) return;

  saving.value = true;
  try {
    const updatedUser = props.userManager.setUserInfo(formData);
    emit('save', updatedUser);
    close();
  } catch (error) {
    console.error('保存用户配置失败:', error);
    alert('保存失败，请稍后重试');
  } finally {
    saving.value = false;
  }
}

/**
 * 关闭对话框
 */
function close(): void {
  emit('close');
}

/**
 * 处理遮罩层点击
 */
function handleOverlayClick(): void {
  close();
}
</script>

<style scoped>
.user-config-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.user-config-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
}

.dialog-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

.dialog-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-hint {
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: #666;
}

.color-picker {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.color-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
  gap: 0.5rem;
  max-width: 400px;
}

.color-option {
  width: 40px;
  height: 40px;
  border: 3px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.color-option:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.color-option.active {
  border-color: #333;
  transform: scale(1.1);
}

.color-option.active::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-weight: bold;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.custom-color {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.color-input {
  width: 60px;
  height: 40px;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
}

.color-value {
  font-family: monospace;
  font-size: 0.9rem;
  color: #666;
  background: #f5f5f5;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.preferences {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.95rem;
}

.checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-text {
  color: #333;
}

.user-id-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.user-id-display code {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #495057;
  background: none;
  padding: 0;
}

.copy-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.copy-btn:hover {
  background: #5a6268;
}

.error-section {
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

.error-title {
  font-weight: 600;
  color: #c53030;
  margin-bottom: 0.5rem;
}

.error-list {
  margin: 0;
  padding-left: 1.25rem;
}

.error-item {
  color: #c53030;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.error-text {
  color: #c53030;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-top: 1px solid #eee;
  background: #f8f9fa;
}

.footer-actions {
  display: flex;
  gap: 0.5rem;
}

.footer-main {
  display: flex;
  gap: 0.75rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.import-dialog {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 400px;
  z-index: 1001;
}

.import-textarea {
  width: 100%;
  height: 200px;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.85rem;
  resize: vertical;
  box-sizing: border-box;
}

.import-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
</style>