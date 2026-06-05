import { useEffect, useState } from "react";
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
import {
  checkmarkCircleOutline,
  cloudOfflineOutline,
  logInOutline,
  phonePortraitOutline,
  rocketOutline,
} from "ionicons/icons";

import {
  BackendStatus,
  CurrentUser,
  fetchBackendStatus,
  fetchCurrentUser,
  getBackendLoginUrl,
} from "../api/backend";

import "./HomePage.css";

type ConnectionState = "loading" | "connected" | "error";

export default function HomePage() {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("loading");
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(
    null,
  );
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBackendState() {
      try {
        const [status, user] = await Promise.all([
          fetchBackendStatus(),
          fetchCurrentUser(),
        ]);

        if (!isMounted) {
          return;
        }

        setBackendStatus(status);
        setCurrentUser(user);
        setConnectionState("connected");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setConnectionState("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Backend connection failed.",
        );
      }
    }

    void loadBackendState();

    return () => {
      isMounted = false;
    };
  }, []);

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
              <h1>Jungle AI is connected</h1>
              <p>
                The Ionic React frontend now checks the Spring Boot backend
                through the proxied API route.
              </p>
            </IonText>

            <div
              className={`home-page__status home-page__status--${connectionState}`}
            >
              <IonIcon
                icon={
                  connectionState === "error"
                    ? cloudOfflineOutline
                    : checkmarkCircleOutline
                }
              />
              <div>
                <strong>
                  {connectionState === "loading" && "Checking backend"}
                  {connectionState === "connected" && "Backend connected"}
                  {connectionState === "error" && "Backend unavailable"}
                </strong>
                <span>
                  {connectionState === "loading" &&
                    "Waiting for the API response..."}
                  {connectionState === "connected" &&
                    `${backendStatus?.service} is ${backendStatus?.status}.`}
                  {connectionState === "error" && errorMessage}
                </span>
              </div>
            </div>

            <div className="home-page__auth">
              <span>
                {currentUser
                  ? `Signed in as ${currentUser.username}`
                  : "No backend session is active in this browser."}
              </span>
              {!currentUser && (
                <IonButton
                  fill="outline"
                  href={getBackendLoginUrl()}
                  rel="noreferrer"
                  target="_blank"
                >
                  <IonIcon icon={logInOutline} slot="start" />
                  Backend login
                </IonButton>
              )}
            </div>
          </section>
        </main>
      </IonContent>
    </IonPage>
  );
}
