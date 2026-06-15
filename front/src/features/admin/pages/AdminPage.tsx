import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IonContent, IonIcon, IonPage } from "@ionic/react";
import {
  alertCircleOutline,
  arrowBackOutline,
  refreshOutline,
  shieldCheckmarkOutline,
  syncOutline,
  trashOutline,
} from "ionicons/icons";

import {
  fetchCurrentUser,
  type CurrentUser,
} from "../../../api/backend";
import {
  fetchAdminAgentRuns,
  fetchAdminAuditLogs,
  fetchAdminEconomySyncRuns,
  fetchAdminReports,
  fetchAdminUsers,
  hardDeleteAdminComment,
  hardDeleteAdminPost,
  hideAdminComment,
  hideAdminPost,
  retryAdminAgentRun,
  suspendAdminUser,
  triggerAdminEconomySync,
  unsuspendAdminUser,
  updateAdminUserRoles,
  type AdminUserItem,
  type AgentRunItem,
  type AuditLogItem,
  type BoardReportItem,
  type EconomySyncRunItem,
} from "../api/admin";

import "./AdminPage.css";

type AdminTab = "users" | "reports" | "economy" | "agents" | "audit";

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "users", label: "사용자" },
  { id: "reports", label: "신고/콘텐츠" },
  { id: "economy", label: "경제 동기화" },
  { id: "agents", label: "Agent runs" },
  { id: "audit", label: "감사 로그" },
];

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [tab, setTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [reports, setReports] = useState<BoardReportItem[]>([]);
  const [syncRuns, setSyncRuns] = useState<EconomySyncRunItem[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRunItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const isAdmin = currentUser?.roles.includes("ROLE_ADMIN") ?? false;

  const loadAdminData = useCallback(async () => {
    const [userPage, reportItems, economyItems, agentItems, auditPage] = await Promise.all([
      fetchAdminUsers(),
      fetchAdminReports(),
      fetchAdminEconomySyncRuns(),
      fetchAdminAgentRuns(),
      fetchAdminAuditLogs(),
    ]);
    setUsers(userPage.items);
    setReports(reportItems);
    setSyncRuns(economyItems);
    setAgentRuns(agentItems);
    setAuditLogs(auditPage.items);
  }, []);

  useEffect(() => {
    let ignore = false;
    async function boot() {
      try {
        setIsLoading(true);
        setMessage(null);
        const user = await fetchCurrentUser();
        if (ignore) return;
        setCurrentUser(user);
        if (user?.roles.includes("ROLE_ADMIN") && (!user.adminMfaRequired || user.adminMfaVerified)) {
          await loadAdminData();
        }
      } catch (error) {
        if (!ignore) {
          setMessage(error instanceof Error ? error.message : "관리자 데이터를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    void boot();
    return () => {
      ignore = true;
    };
  }, [loadAdminData]);

  async function reload() {
    try {
      setMessage(null);
      setIsLoading(true);
      await loadAdminData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "새로고침에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function runAction(action: () => Promise<void>, doneMessage: string) {
    try {
      setMessage(null);
      await action();
      await loadAdminData();
      setMessage(doneMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "관리자 작업에 실패했습니다.");
    }
  }

  return (
    <IonPage>
      <IonContent fullscreen>
        <main className="admin-shell">
          <header className="admin-header">
            <Link className="admin-back" to="/home">
              <IonIcon icon={arrowBackOutline} />
              <span>홈으로</span>
            </Link>
            <div>
              <strong>Admin Console</strong>
              <p>신고, 사용자, 경제 동기화, Agent run, 감사 로그를 확인합니다.</p>
            </div>
            {isAdmin && (!currentUser?.adminMfaRequired || currentUser.adminMfaVerified) && (
              <button className="admin-icon-button" type="button" onClick={() => void reload()}>
                <IonIcon icon={refreshOutline} />
                <span>새로고침</span>
              </button>
            )}
          </header>

          {isLoading && (
            <section className="admin-state">
              <IonIcon icon={syncOutline} />
              <strong>관리자 상태 확인 중</strong>
            </section>
          )}

          {!isLoading && !currentUser && (
            <section className="admin-state">
              <IonIcon icon={shieldCheckmarkOutline} />
              <strong>로그인이 필요합니다.</strong>
              <Link to="/auth">로그인 / 회원가입</Link>
            </section>
          )}

          {!isLoading && currentUser && !isAdmin && (
            <section className="admin-state is-error">
              <IonIcon icon={alertCircleOutline} />
              <strong>관리자 권한이 없습니다.</strong>
              <span>ROLE_ADMIN 계정만 접근할 수 있습니다.</span>
            </section>
          )}

          {!isLoading && currentUser && isAdmin && currentUser.adminMfaRequired && !currentUser.adminMfaVerified && (
            <section className="admin-state is-error">
              <IonIcon icon={shieldCheckmarkOutline} />
              <strong>관리자 MFA 인증이 필요합니다.</strong>
              <span>TOTP 앱으로 6자리 코드를 확인한 뒤 관리자 콘솔에 접근할 수 있습니다.</span>
              <Link to="/auth">MFA 인증하러 가기</Link>
            </section>
          )}

          {message && (
            <section className="admin-message" aria-live="polite">
              {message}
            </section>
          )}

          {!isLoading && isAdmin && (!currentUser?.adminMfaRequired || currentUser.adminMfaVerified) && (
            <>
              <nav className="admin-tabs" aria-label="관리자 탭">
                {tabs.map((item) => (
                  <button
                    className={tab === item.id ? "is-active" : ""}
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              {tab === "users" && (
                <section className="admin-panel">
                  <h2>사용자</h2>
                  <div className="admin-table">
                    {users.map((user) => (
                      <article className="admin-row" key={user.id}>
                        <div>
                          <strong>{user.nickname || user.displayName || user.email || `user-${user.id}`}</strong>
                          <span>{user.email ?? user.provider} · {user.roles.join(", ")}</span>
                          <small>{user.emailVerified ? "verified" : "pending"} · {user.suspended ? "suspended" : "active"}</small>
                        </div>
                        <div className="admin-actions">
                          <button
                            type="button"
                            onClick={() => void runAction(
                              () => updateAdminUserRoles(
                                user.id,
                                user.roles.includes("ROLE_ADMIN") ? ["ROLE_USER"] : ["ROLE_USER", "ROLE_ADMIN"],
                              ).then(() => undefined),
                              "권한이 변경되었습니다.",
                            )}
                          >
                            {user.roles.includes("ROLE_ADMIN") ? "관리자 해제" : "관리자 부여"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void runAction(
                              () => (user.suspended ? unsuspendAdminUser(user.id) : suspendAdminUser(user.id)).then(() => undefined),
                              "사용자 상태가 변경되었습니다.",
                            )}
                          >
                            {user.suspended ? "정지 해제" : "정지"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {tab === "reports" && (
                <section className="admin-panel">
                  <h2>신고/콘텐츠</h2>
                  <div className="admin-table">
                    {reports.length === 0 && <p className="admin-empty">현재 신고가 없습니다.</p>}
                    {reports.map((report) => (
                      <article className="admin-row" key={report.id}>
                        <div>
                          <strong>{report.targetType} #{report.postId}</strong>
                          <span>{report.reason} · {report.detail || "상세 없음"}</span>
                          <small>{report.createdAt}</small>
                        </div>
                        <div className="admin-actions">
                          <button
                            type="button"
                            onClick={() => void runAction(
                              () => report.commentId
                                ? hideAdminComment(report.commentId)
                                : hideAdminPost(report.postId),
                              "콘텐츠를 숨김 처리했습니다.",
                            )}
                          >
                            숨김
                          </button>
                          <button
                            className="is-danger"
                            type="button"
                            onClick={() => {
                              if (!window.confirm("이 콘텐츠를 영구 삭제할까요?")) return;
                              void runAction(
                                () => report.commentId
                                  ? hardDeleteAdminComment(report.commentId)
                                  : hardDeleteAdminPost(report.postId),
                                "콘텐츠를 영구 삭제했습니다.",
                              );
                            }}
                          >
                            <IonIcon icon={trashOutline} />
                            <span>Hard delete</span>
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {tab === "economy" && (
                <section className="admin-panel">
                  <div className="admin-panel__title">
                    <h2>경제 동기화</h2>
                    <button
                      type="button"
                      onClick={() => void runAction(triggerAdminEconomySync, "경제 동기화를 요청했습니다.")}
                    >
                      수동 sync
                    </button>
                  </div>
                  <div className="admin-table">
                    {syncRuns.map((run) => (
                      <article className="admin-row" key={run.id}>
                        <div>
                          <strong>{run.source}</strong>
                          <span>{run.status}</span>
                          <small>{run.startedAt} · {run.errorMessage ?? "no error"}</small>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {tab === "agents" && (
                <section className="admin-panel">
                  <h2>Agent runs</h2>
                  <div className="admin-table">
                    {agentRuns.map((run) => (
                      <article className="admin-row" key={run.id}>
                        <div>
                          <strong>#{run.id} · {run.runType}</strong>
                          <span>{run.status} · {run.model}</span>
                          <small>{run.errorMessage ?? run.summary}</small>
                        </div>
                        <div className="admin-actions">
                          <button
                            type="button"
                            onClick={() => void runAction(
                              () => retryAdminAgentRun(run.id),
                              "Agent run 재시도를 요청했습니다.",
                            )}
                          >
                            재시도
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {tab === "audit" && (
                <section className="admin-panel">
                  <h2>감사 로그</h2>
                  <div className="admin-table">
                    {auditLogs.map((log) => (
                      <article className="admin-row" key={log.id}>
                        <div>
                          <strong>{log.action}</strong>
                          <span>{log.targetType} · {log.targetId}</span>
                          <small>{log.createdAt} · admin #{log.adminUserId}</small>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </IonContent>
    </IonPage>
  );
}
