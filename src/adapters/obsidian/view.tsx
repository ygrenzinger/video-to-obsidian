import { ItemView, MarkdownRenderer, WorkspaceLeaf } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import { VideoToObsidianApp } from '../../ui/VideoToObsidianApp';
import type VideoToObsidianPlugin from './plugin';

export const VIEW_TYPE_VIDEO_TO_OBSIDIAN = 'video-to-obsidian-view';

export class VideoToObsidianView extends ItemView {
  private root: Root | null = null;

  constructor(leaf: WorkspaceLeaf, private readonly plugin: VideoToObsidianPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_VIDEO_TO_OBSIDIAN;
  }

  getDisplayText(): string {
    return 'Video To Obsidian';
  }

  getIcon(): string {
    return 'file-video';
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    const mount = this.contentEl.createDiv({ cls: 'vto-root' });
    this.root = createRoot(mount, {
      identifierPrefix: `${this.plugin.manifest.id}-`
    });
    this.root.render(
      <VideoToObsidianApp
        workflow={this.plugin}
        renderMarkdown={(markdown, element, sourcePath) =>
          MarkdownRenderer.render(this.app, markdown, element, sourcePath, this)
        }
      />
    );
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }
}
