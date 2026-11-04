import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { BehaviorSubject, EMPTY } from 'rxjs';

import { Tab2PageModule } from './tab2.module';
import { Tab2Page } from './tab2.page';
import { AgricultureToolService } from '../tools/tool.service';
import { AgricultureTool } from '../tools/tool.model';

describe('Tab2Page', () => {
  let component: Tab2Page;
  let fixture: ComponentFixture<Tab2Page>;
  let updateTool: ReturnType<typeof vi.fn>;
  let createToast: ReturnType<typeof vi.fn>;
  let toolsSubject: BehaviorSubject<AgricultureTool[]>;

  beforeEach(async () => {
    toolsSubject = new BehaviorSubject<AgricultureTool[]>([]);
    updateTool = vi.fn().mockResolvedValue(undefined);
    createToast = vi.fn().mockResolvedValue({ present: vi.fn().mockResolvedValue(undefined) });
    await TestBed.configureTestingModule({
      imports: [Tab2PageModule, RouterModule.forRoot([])]
    })
      .overrideProvider(AgricultureToolService, {
        useValue: { tools$: toolsSubject.asObservable(), errors$: EMPTY, updateTool },
      })
      .overrideProvider(ToastController, { useValue: { create: createToast } })
      .compileComponents();

    fixture = TestBed.createComponent(Tab2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows a newly added tool in the all-equipment list', () => {
    component.searchTerm = 'old search';
    component.selectedFilter = 'attention';

    toolsSubject.next([{
      id: 'tool-1',
      name: 'Tiller',
      category: 'Tillage',
      brand: '',
      location: '',
      condition: 'Excellent',
      lastMaintenance: '2026-11-04',
      purchaseDate: '',
      notes: '',
    }]);

    expect(component.searchTerm).toBe('');
    expect(component.selectedFilter).toBe('all');
    expect(component.filteredTools.map((tool) => tool.name)).toEqual(['Tiller']);
    expect(fixture.nativeElement.textContent).toContain('Tiller');
  });

  it('stops showing the save spinner if Firestore does not confirm the update', async () => {
    vi.useFakeTimers();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    updateTool.mockReturnValue(new Promise<void>(() => undefined));
    component.editingTool = {
      id: 'tool-1',
      name: 'Tiller',
      category: 'Tillage',
      brand: '',
      location: '',
      condition: 'Good',
      lastMaintenance: '2026-11-04',
      purchaseDate: '',
      notes: '',
    };
    component.editDraft = {
      name: 'Tiller',
      category: 'Tillage',
      brand: '',
      location: '',
      condition: 'Good',
      lastMaintenance: '2026-11-04',
      purchaseDate: '',
      notes: '',
    };
    component.isEditOpen = true;

    try {
      const save = component.saveEdit();
      expect(component.isSavingEdit).toBe(true);

      await vi.advanceTimersByTimeAsync(15_000);
      await save;

      fixture.detectChanges();
      expect(component.isSavingEdit).toBe(false);
      expect(component.isEditOpen).toBe(true);
      expect(createToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Firestore has not confirmed the update yet'),
        }),
      );
    } finally {
      consoleError.mockRestore();
      vi.useRealTimers();
    }
  });
});
