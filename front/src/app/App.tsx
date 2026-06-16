import { Redirect, Route } from "react-router-dom";
import { IonApp, IonRouterOutlet, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";

import HomePage from "../features/economy/pages/HomePage";
import MyPage from "../features/profile/pages/MyPage";
import AuthPage from "../features/auth/pages/AuthPage";
import AdminPage from "../features/admin/pages/AdminPage";
import HomeSearchPage from "../features/search/pages/HomeSearchPage";
import { I18nProvider } from "../i18n/I18nProvider";
import { ThemeProvider } from "../theme/ThemeProvider";

import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";
import "../theme/variables.css";

setupIonicReact();

export default function App() {
  return (
    <IonApp>
      <ThemeProvider>
        <I18nProvider>
          <IonReactRouter>
            <IonRouterOutlet>
              <Route exact path="/home" component={HomePage} />
              <Route exact path="/search" component={HomeSearchPage} />
              <Route exact path="/auth" component={AuthPage} />
              <Route exact path="/mypage" component={MyPage} />
              <Route exact path="/admin" component={AdminPage} />
              <Route exact path="/">
                <Redirect to="/home" />
              </Route>
            </IonRouterOutlet>
          </IonReactRouter>
        </I18nProvider>
      </ThemeProvider>
    </IonApp>
  );
}
