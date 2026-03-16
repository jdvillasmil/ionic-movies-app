import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons } from '@ionic/angular/standalone';

@Component({
  selector: 'app-media-detail',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Detalle</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p>Detalle de media (próximamente - Fase 4)</p>
      <p>mediaType: {{ mediaType }}, id: {{ id }}</p>
    </ion-content>
  `,
})
export class MediaDetailPage {
  private route = inject(ActivatedRoute);
  mediaType = this.route.snapshot.paramMap.get('mediaType');
  id = this.route.snapshot.paramMap.get('id');
}
