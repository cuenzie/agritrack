import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';

import { Tab1PageModule } from './tab1.module';
import { Tab1Page } from './tab1.page';

describe('Tab1Page', () => {
  let component: Tab1Page;
  let fixture: ComponentFixture<Tab1Page>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tab1PageModule, RouterModule.forRoot([])]
    }).compileComponents();

    fixture = TestBed.createComponent(Tab1Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows only the requested equipment fields', () => {
    const fieldNames = Array.from(
      fixture.nativeElement.querySelectorAll(
        'form.tool-form ion-input, form.tool-form ion-select, form.tool-form ion-textarea',
      ) as NodeListOf<HTMLElement>,
    ).map((field) => field.getAttribute('name'));

    expect(fieldNames).toEqual(['name', 'condition', 'purchaseDate']);
  });
});
