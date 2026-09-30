import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

describe('Console AppComponent', () => {
  it('creates the console application root', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    expect(
      TestBed.createComponent(AppComponent).componentInstance,
    ).toBeTruthy();
  });
});
