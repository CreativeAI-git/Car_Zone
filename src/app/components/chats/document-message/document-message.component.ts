import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../../models/chat.model';

@Component({
  selector: 'app-document-message',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="ct_doc_card"
      [class.clickable]="message.status !== 'sending' && message.status !== 'failed' && message.mediaUrl"
      (click)="onCardClick()">
      
      <div class="ct_doc_header d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-3 min-w-0 flex-grow-1 me-2">
          <div class="ct_doc_icon_box" [ngClass]="getDocIconClass()">
            <i class="fa-solid" [ngClass]="getDocIcon()"></i>
          </div>
          <div class="ct_doc_info flex-grow-1 min-w-0">
            <div class="ct_doc_name text-truncate" [title]="message.fileName || 'Document'">
              {{ message.fileName || 'Document' }}
            </div>
            <div class="ct_doc_meta d-flex align-items-center gap-2 ct_fs_12 mt-1 text-truncate">
              <span>{{ formatFileSize(message.fileSize) }}</span>
              <span class="ct_dot_separator">•</span>
              <span class="text-uppercase fw-semibold">{{ getExtensionLabel() }}</span>
            </div>
          </div>
        </div>

        @if ((message.status === 'sent' || message.uploadState === 'complete' || message.mediaUrl) && message.status !== 'sending' && message.status !== 'failed') {
          <div class="ct_doc_open_icon flex-shrink-0 ms-2" title="Open in new tab">
            <i class="fa-solid fa-arrow-up-right-from-square ct_fs_14"></i>
          </div>
        }
      </div>

      <!-- Live Upload Progress Bar -->
      @if (message.status === 'sending' || message.uploadState === 'start' || message.uploadState === 'uploading') {
        <div class="ct_doc_progress_container mt-2" (click)="$event.stopPropagation()">
          <div class="d-flex justify-content-between ct_fs_12 text-muted mb-1">
            <span>Uploading...</span>
            <span>{{ message.progress || 0 }}%</span>
          </div>
          <div class="progress" style="height: 4px;">
            <div
              class="progress-bar bg-danger progress-bar-striped progress-bar-animated"
              role="progressbar"
              [style.width.%]="message.progress || 0"
              [attr.aria-valuenow]="message.progress || 0"
              aria-valuemin="0"
              aria-valuemax="100">
            </div>
          </div>
        </div>
      }

      <!-- Failed State & Retry Button -->
      @if (message.status === 'failed' || message.uploadState === 'failed') {
        <div class="ct_doc_failed_container d-flex align-items-center justify-content-between mt-2 pt-2 border-top border-light" (click)="$event.stopPropagation()">
          <span class="ct_fs_12 text-danger fw-medium d-flex align-items-center gap-1">
            <i class="fa-solid fa-circle-exclamation"></i> Upload failed
          </span>
          <button type="button" class="btn btn-sm btn-outline-danger py-0 px-2 ct_fs_12" (click)="retryUpload.emit(message)">
            <i class="fa-solid fa-rotate-right me-1"></i> Retry
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .ct_doc_card {
      width: 100%;
      min-width: 200px;
      padding: 8px 12px;
      border-radius: 10px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
      box-sizing: border-box;
    }
    .ct_doc_card.clickable {
      cursor: pointer;
    }
    .ct_doc_card.clickable:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
    .ct_doc_name {
      color: #111827;
      font-weight: 600;
      font-size: 14px;
      line-height: 1.3;
      max-width: 200px;
    }
    .ct_doc_meta {
      color: #6b7280;
    }
    .ct_dot_separator {
      color: #9ca3af;
    }
    .ct_doc_open_icon {
      color: #dc2626;
      transition: transform 0.15s ease;
    }
    .ct_doc_card:hover .ct_doc_open_icon {
      transform: scale(1.15);
    }
    .ct_doc_icon_box {
      width: 40px;
      height: 40px;
      min-width: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    .ct_icon_pdf {
      background-color: #fee2e2;
      color: #dc2626;
    }
    .ct_icon_word {
      background-color: #dbeafe;
      color: #2563eb;
    }
    .ct_icon_excel {
      background-color: #dcfce7;
      color: #16a34a;
    }
    .ct_icon_generic {
      background-color: #f3f4f6;
      color: #4b5563;
    }
  `]
})
export class DocumentMessageComponent {
  @Input() message!: ChatMessage;
  @Input() isOutgoing: boolean = false;

  @Output() openPreview = new EventEmitter<ChatMessage>();
  @Output() retryUpload = new EventEmitter<ChatMessage>();

  onCardClick() {
    if (!this.message || this.message.status === 'sending' || this.message.status === 'failed' || !this.message.mediaUrl) {
      return;
    }

    const url = this.message.mediaUrl;
    window.open(url, '_blank');
    this.openPreview.emit(this.message);
  }

  getDocIcon(): string {
    const ext = this.getExtension();
    const mime = (this.message?.mimeType || '').toLowerCase();
    if (ext === 'pdf' || mime.includes('pdf')) {
      return 'fa-file-pdf';
    } else if (['doc', 'docx'].includes(ext) || mime.includes('word') || mime.includes('processingml')) {
      return 'fa-file-word';
    } else if (['xls', 'xlsx'].includes(ext) || mime.includes('excel') || mime.includes('spreadsheetml')) {
      return 'fa-file-excel';
    }
    return 'fa-file-lines';
  }

  getDocIconClass(): string {
    const ext = this.getExtension();
    const mime = (this.message?.mimeType || '').toLowerCase();
    if (ext === 'pdf' || mime.includes('pdf')) {
      return 'ct_icon_pdf';
    } else if (['doc', 'docx'].includes(ext) || mime.includes('word') || mime.includes('processingml')) {
      return 'ct_icon_word';
    } else if (['xls', 'xlsx'].includes(ext) || mime.includes('excel') || mime.includes('spreadsheetml')) {
      return 'ct_icon_excel';
    }
    return 'ct_icon_generic';
  }

  getExtension(): string {
    if (this.message?.fileName) {
      const parts = this.message.fileName.split('.');
      if (parts.length > 1) {
        return parts.pop()!.toLowerCase();
      }
    }
    return '';
  }

  getExtensionLabel(): string {
    const ext = this.getExtension();
    if (ext) return ext.toUpperCase();
    return 'DOC';
  }

  formatFileSize(bytes?: number): string {
    if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
