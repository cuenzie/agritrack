import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AgricultureTool, AgricultureToolDraft } from '../tools/tool.model';
import { AgricultureToolService } from '../tools/tool.service';

type ToolFilter = 'all' | 'attention' | 'ready';

const createToolDraft = (tool: AgricultureTool): AgricultureToolDraft => ({
  name: tool.name,
  category: tool.category,
  brand: tool.brand,
  location: tool.location,
  condition: tool.condition,
  lastMaintenance: tool.lastMaintenance,
  purchaseDate: tool.purchaseDate,
  notes: tool.notes,
});

function localDateString(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit, OnDestroy {
  tools: AgricultureTool[] = [];
  searchTerm = '';
  selectedFilter: ToolFilter = 'all';
  isLoading = true;
  isEditOpen = false;
  isSavingEdit = false;
  editingTool: AgricultureTool | null = null;
  editDraft: AgricultureToolDraft | null = null;

  private readonly subscriptions = new Subscription();
  private readonly toolService = inject(AgricultureToolService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  ngOnInit(): void {
    this.subscriptions.add(
      this.toolService.tools$.subscribe((tools) => {
        this.tools = tools;
        this.isLoading = false;
      }),
    );
    this.subscriptions.add(
      this.toolService.errors$.subscribe((error) => {
        console.error('Unable to read agriculture equipment from Firestore.', error);
        const message = error.code === 'permission-denied'
          ? 'Firestore denied access. Allow read, add, update, and delete on agricultureTools in Firestore Rules.'
          : 'Could not load your inventory. Check your Firestore connection.';
        void this.showToast(message, 'danger');
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get filteredTools(): AgricultureTool[] {
    const query = this.searchTerm.trim().toLocaleLowerCase();
    return this.tools.filter((tool) => {
      const matchesSearch =
        !query ||
        [tool.name, tool.category, tool.brand, tool.location]
          .some((value) => value.toLocaleLowerCase().includes(query));
      const attention = this.needsAttention(tool);
      const matchesFilter =
        this.selectedFilter === 'all' ||
        (this.selectedFilter === 'attention' && attention) ||
        (this.selectedFilter === 'ready' && !attention);
      return matchesSearch && matchesFilter;
    });
  }

  get attentionCount(): number {
    return this.tools.filter((tool) => this.needsAttention(tool)).length;
  }

  get categoryCount(): number {
    return new Set(this.tools.map((tool) => tool.category)).size;
  }

  getToolStatus(tool: AgricultureTool): string {
    if (tool.condition === 'Needs attention') {
      return 'Needs attention';
    }
    return this.isMaintenanceDue(tool) ? 'Service due' : 'Ready to work';
  }

  needsMaintenance(tool: AgricultureTool): boolean {
    return this.needsAttention(tool);
  }

  async openEdit(tool: AgricultureTool): Promise<void> {
    this.editingTool = tool;
    this.editDraft = createToolDraft(tool);
    this.isEditOpen = true;
  }

  closeEdit(): void {
    this.isEditOpen = false;
    this.editingTool = null;
    this.editDraft = null;
  }

  async saveEdit(): Promise<void> {
    if (!this.editingTool || !this.editDraft || this.isSavingEdit) {
      return;
    }

    if (!this.editDraft.name.trim() || !this.editDraft.category) {
      await this.showToast('Add a tool name and choose a type before saving.', 'danger');
      return;
    }

    this.isSavingEdit = true;
    try {
      await this.toolService.updateTool(this.editingTool.id, {
        ...this.editDraft,
        name: this.editDraft.name.trim(),
        brand: this.editDraft.brand.trim(),
        location: this.editDraft.location.trim(),
        notes: this.editDraft.notes.trim(),
      });
      this.closeEdit();
      await this.showToast('Tool details updated.', 'success');
    } catch (error) {
      console.error('Unable to update agriculture tool in Firestore.', error);
      await this.showToast('Could not update this tool. Please try again.', 'danger');
    } finally {
      this.isSavingEdit = false;
    }
  }

  async confirmDelete(tool: AgricultureTool): Promise<void> {
    const alert = await this.alertController.create({
      header: `Remove ${tool.name}?`,
      message: 'This tool will be removed from your inventory.',
      buttons: [
        { text: 'Keep tool', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: () => void this.deleteTool(tool),
        },
      ],
    });
    await alert.present();
  }

  async markServiced(tool: AgricultureTool): Promise<void> {
    try {
      await this.toolService.updateTool(tool.id, {
        ...createToolDraft(tool),
        lastMaintenance: localDateString(),
        condition: tool.condition === 'Needs attention' ? 'Good' : tool.condition,
      });
      await this.showToast(`${tool.name} is marked as serviced.`, 'success');
    } catch (error) {
      console.error('Unable to update tool maintenance date in Firestore.', error);
      await this.showToast('Could not update the service date. Please try again.', 'danger');
    }
  }

  async handleRefresh(event: CustomEvent<{ complete: () => void }>): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 350));
    event.detail.complete();
  }

  private async deleteTool(tool: AgricultureTool): Promise<void> {
    try {
      await this.toolService.deleteTool(tool.id);
      await this.showToast(`${tool.name} was removed from your inventory.`, 'success');
    } catch (error) {
      console.error('Unable to remove agriculture tool from Firestore.', error);
      await this.showToast('Could not remove this tool. Please try again.', 'danger');
    }
  }

  private needsAttention(tool: AgricultureTool): boolean {
    return tool.condition === 'Needs attention' || this.isMaintenanceDue(tool);
  }

  private isMaintenanceDue(tool: AgricultureTool): boolean {
    const lastMaintenance = new Date(`${tool.lastMaintenance}T00:00:00`);
    if (Number.isNaN(lastMaintenance.getTime())) {
      return true;
    }
    const daysSinceMaintenance = Math.floor(
      (new Date().setHours(0, 0, 0, 0) - lastMaintenance.getTime()) / 86_400_000,
    );
    return daysSinceMaintenance > 90;
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
