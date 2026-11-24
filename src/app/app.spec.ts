import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { PanelComponent } from './panel.component';

describe('PanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelComponent],
      providers: [provideHttpClient(), provideRouter([])],
    })
      .compileComponents();
  });

  it('should create the panel', () => {
    const fixture = TestBed.createComponent(PanelComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the ReparaYa heading', async () => {
    const fixture = TestBed.createComponent(PanelComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Organiza cada reparación');
  });
});
