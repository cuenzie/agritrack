import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AgricultureToolDraft } from '../tools/tool.model';
import { AgricultureToolService } from '../tools/tool.service';

const createEmptyTool = (): AgricultureToolDraft => ({
  name: '',
  category: 'Tillage',
  brand: '',
  location: '',
  condition: 'Good',
  lastMaintenance: localDateString(),
  purchaseDate: '',
  notes: '',
});

function localDateString(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit, OnDestroy {
  private static readonly saveTimeoutMs = 15_000;

  toolsCount = 0;
  attentionCount = 0;
  isSaving = false;
  tool: AgricultureToolDraft = createEmptyTool();
  private pendingToolId: string | null = null;

  private readonly subscriptions = new Subscription();

  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly toolService = inject(AgricultureToolService);
  private readonly toastController = inject(ToastController);

  ngOnInit(): void {
    this.subscriptions.add(
      this.toolService.tools$.subscribe((tools) => {
        this.toolsCount = tools.length;
        this.attentionCount = tools.filter((tool) => this.needsAttention(tool)).length;
      }),
    );
    this.subscriptions.add(
      this.toolService.errors$.subscribe((error) => {
        console.error('Unable to connect to Firestore.', error);
        const message = error.code === 'permission-denied'
          ? 'Firestore denied access. Update its rules to allow access to the agricultureTools collection.'
          : 'Could not connect to your inventory. Check your Firestore connection.';
        void this.showToast(message, 'danger');
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  async addTool(): Promise<void> {
    if (this.isSaving) {
      return;
    }

    if (!this.tool.name.trim() || !this.tool.category || !this.tool.lastMaintenance) {
      await this.showToast('Add a tool name, choose a type, and select the last serviced date before saving.', 'danger');
      return;
    }

    this.isSaving = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const toolId = this.pendingToolId ?? this.toolService.createToolId();
      this.pendingToolId = toolId;
      const save = this.toolService.addTool({
        ...this.tool,
        name: this.tool.name.trim(),
        brand: this.tool.brand.trim(),
        location: this.tool.location.trim(),
        notes: this.tool.notes.trim(),
      }, toolId);

      await Promise.race([
        save,
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('firestore-save-timeout')),
            Tab1Page.saveTimeoutMs,
          );
        }),
      ]);

      this.tool = createEmptyTool();
      this.pendingToolId = null;
      await this.showToast('Your new tool is in the inventory.', 'success');
    } catch (error) {
      console.error('Unable to add tool to Firestore.', error);
      const message = error instanceof Error && error.message === 'firestore-save-timeout'
        ? 'Firestore has not confirmed the save yet. Check your inventory; retrying is safe.'
        : 'Could not save this tool. Check your Firestore connection and try again.';
      await this.showToast(message, 'danger');
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      this.isSaving = false;
      this.changeDetector.detectChanges();
    }
  }

  private needsAttention(tool: { condition: string; lastMaintenance: string }): boolean {
    if (tool.condition === 'Needs attention') {
      return true;
    }

    const lastMaintenance = new Date(`${tool.lastMaintenance}T00:00:00`);
    const daysSinceMaintenance = Math.floor(
      (new Date().setHours(0, 0, 0, 0) - lastMaintenance.getTime()) / 86_400_000,
    );
    return Number.isNaN(lastMaintenance.getTime()) || daysSinceMaintenance > 90;
  }

  private async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 2800,
      position: 'top',
      buttons: [{ text: 'Dismiss', role: 'cancel' }],
    });
    await toast.present();
  }
}
