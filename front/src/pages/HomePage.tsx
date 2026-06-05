import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { phonePortraitOutline, rocketOutline } from "ionicons/icons";

import "./HomePage.css";

export default function HomePage() {
  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Jungle AI</IonTitle>
          <IonButtons slot="end">
            <IonButton aria-label="Mobile ready">
              <IonIcon icon={phonePortraitOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <main className="home-page">
          <section className="home-page__panel">
            <div className="home-page__icon">
              <IonIcon icon={rocketOutline} />
            </div>
            <IonText>
              <h1>Frontend is ready</h1>
              <p>
                React, TypeScript, Vite, Ionic React, and Capacitor are wired
                for web development and future mobile app expansion.
              </p>
            </IonText>
          </section>
        </main>
      </IonContent>
    </IonPage>
  );
}
