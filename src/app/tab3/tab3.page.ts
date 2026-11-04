import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AgricultureTool } from '../tools/tool.model';
import { AgricultureToolService } from '../tools/tool.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit, OnDestroy {
  tools: AgricultureTool[] = [];

  private readonly subscriptions = new Subscription();
  private readonly toolService = inject(AgricultureToolService);
  private readonly toastController = inject(ToastController);

  ngOnInit(): void {
    this.subscriptions.add(
      this.toolService.tools$.subscribe((tools) => {
        this.tools = tools;
      }),
    );
    this.subscriptions.add(
      this.toolService.errors$.subscribe((error) => {
        console.error('Unable to load tool-care summary from Firestore.', error);
        void this.showToast('Could not load your tool-care summary. Check your Firestore connection.', 'danger');
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get attentionCount(): number {
    return this.tools.filter((tool) => this.needsAttention(tool)).length;
  }

  get categoryCount(): number {
    return new Set(this.tools.map((tool) => tool.category)).size;
  }

  private needsAttention(tool: AgricultureTool): boolean {
    if (tool.condition === 'Needs attention') {
      return true;
    }
    const lastMaintenance = new Date(`${tool.lastMaintenance}T00:00:00`);
    if (Number.isNaN(lastMaintenance.getTime())) {
      return true;
    }
    const daysSinceMaintenance = Math.floor(
      (new Date().setHours(0, 0, 0, 0) - lastMaintenance.getTime()) / 86_400_000,
    );
    return daysSinceMaintenance > 90;
  }

  private async showToast(message: string, color: 'danger'): Promise<void> {
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
