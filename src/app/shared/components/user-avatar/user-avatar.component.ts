import { Component, Input } from '@angular/core';
import { NgIf, NgStyle } from '@angular/common';

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 50%, 45%)`;
}

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [NgIf, NgStyle],
  template: `
    <img
      *ngIf="avatarUrl; else initialsCircle"
      [src]="avatarUrl"
      [alt]="'Avatar de ' + displayName"
      [style.width.px]="size"
      [style.height.px]="size"
      [style.border-radius]="'50%'"
      [style.object-fit]="'cover'"
    />
    <ng-template #initialsCircle>
      <div
        [ngStyle]="{
          width: size + 'px',
          height: size + 'px',
          'border-radius': '50%',
          background: bgColor,
          color: 'white',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'font-size': size * 0.4 + 'px',
          'font-weight': '600',
          'user-select': 'none'
        }"
      >
        {{ initials }}
      </div>
    </ng-template>
  `,
})
export class UserAvatarComponent {
  @Input() displayName = '';
  @Input() avatarUrl = '';
  @Input() size = 48;

  get initials(): string {
    return this.displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 3)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  get bgColor(): string {
    return hashColor(this.displayName);
  }
}
