import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { IonContent, IonIcon, IonPage, useIonViewWillEnter } from "@ionic/react";
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
  dismissAdminReport,
  fetchAdminAgentRuns,
  fetchAdminAuditLogs,
  fetchAdminEconomySyncRuns,
  fetchAdminHiddenContent,
  fetchAdminReports,
  fetchAdminUsers,
  hardDeleteAdminAgentRun,
  hardDeleteAdminComment,
  hardDeleteAdminPost,
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
  type HiddenContentItem,
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

const adminTabs = tabs;

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [tab, setTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [reports, setReports] = useState<BoardReportItem[]>([]);
  const [hiddenContent, setHiddenContent] = useState<HiddenContentItem[]>([]);
  const [syncRuns, setSyncRuns] = useState<EconomySyncRunItem[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRunItem[]>([]);
  const [hiddenAgentRuns, setHiddenAgentRuns] = useState<AgentRunItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const isAdmin = currentUser?.roles.includes("ROLE_ADMIN") ?? false;

  const loadAdminData = useCallback(async () => {
    const [userPage, reportItems, hiddenContentItems, economyItems, agentItems, hiddenAgentItems, auditPage] = await Promise.all([
      fetchAdminUsers(),
      fetchAdminReports(),
      fetchAdminHiddenContent(),
      fetchAdminEconomySyncRuns(),
      fetchAdminAgentRuns("active"),
      fetchAdminAgentRuns("hidden"),
      fetchAdminAuditLogs(),
    ]);
    setUsers(userPage.items);
    setReports(reportItems);
    setHiddenContent(hiddenContentItems);
    setSyncRuns(economyItems);
    setAgentRuns(agentItems);
    setHiddenAgentRuns(hiddenAgentItems);
    setAuditLogs(auditPage.items);
  }, []);

  const refreshAdminSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setMessage(null);
      const user = await fetchCurrentUser();
      setCurrentUser(user);
      if (user?.roles.includes("ROLE_ADMIN") && (!user.adminMfaRequired || user.adminMfaVerified)) {
        await loadAdminData();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "관리자 데이터를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [loadAdminData]);

  useIonViewWillEnter(() => {
    void refreshAdminSession();
  }, [refreshAdminSession]);

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
              <Link to="/auth?mfa=1">MFA 인증하러 가기</Link>
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
                {adminTabs.map((item) => (
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
                  <div className="admin-subsection">
                    <h3>신고 접수 내역</h3>
                    <div className="admin-table">
                      {reports.length === 0 && <p className="admin-empty">접수된 신고가 없습니다.</p>}
                      {reports.map((report) => (
                        <article className="admin-row admin-row--report" key={report.id}>
                          <div>
                            <strong>
                              {report.targetType === "COMMENT" ? "댓글" : "게시글"} #{report.commentId ?? report.postId}
                            </strong>
                            <span>{report.postTitle}</span>
                            <small>
                              신고자 #{report.reporterUserId} · 대상 작성자 {report.targetAuthor ?? "unknown"} · {report.createdAt ?? "unknown"}
                            </small>
                            <dl className="admin-report-detail">
                              <div>
                                <dt>신고 사유</dt>
                                <dd>{report.reason}</dd>
                              </div>
                              <div>
                                <dt>신고 내용</dt>
                                <dd>{report.detail || "상세 내용 없음"}</dd>
                              </div>
                              <div>
                                <dt>신고 대상</dt>
                                <dd>{report.targetContent ?? "대상 내용을 불러올 수 없습니다."}</dd>
                              </div>
                            </dl>
                          </div>
                          <div className="admin-actions">
                            <button
                              type="button"
                              onClick={() => {
                                if (!window.confirm("이 신고 내역을 삭제할까요? 게시글/댓글은 삭제되지 않습니다.")) return;
                                void runAction(
                                  () => dismissAdminReport(report.id),
                                  "신고 내역을 삭제했습니다.",
                                );
                              }}
                            >
                              <IonIcon icon={trashOutline} />
                              <span>신고 내역 삭제</span>
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                  <h2>숨김 콘텐츠 검토</h2>
                  <div className="admin-table">
                    {hiddenContent.length === 0 && <p className="admin-empty">현재 숨김 처리된 토론 콘텐츠가 없습니다.</p>}
                    {hiddenContent.map((item) => (
                      <article className="admin-row" key={`${item.targetType}-${item.commentId ?? item.postId}`}>
                        <div>
                          <strong>{item.targetType === "COMMENT" ? "댓글" : "토론글"} #{item.commentId ?? item.postId}</strong>
                          <span>{item.postTitle}</span>
                          <small>{item.author} · 숨김: {item.hiddenAt ?? "unknown"}</small>
                          <p className="admin-row__body">{item.content}</p>
                        </div>
                        <div className="admin-actions">
                          <button
                            className="is-danger"
                            type="button"
                            onClick={() => {
                              if (!window.confirm("이 숨김 콘텐츠를 영구삭제할까요? 연결된 댓글, 신고, 알림, RAG 데이터도 함께 정리됩니다.")) return;
                              void runAction(
                                () => item.commentId
                                  ? hardDeleteAdminComment(item.commentId)
                                  : hardDeleteAdminPost(item.postId),
                                "숨김 콘텐츠를 영구삭제했습니다.",
                              );
                            }}
                          >
                            <IonIcon icon={trashOutline} />
                            <span>영구삭제</span>
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
                  <div className="admin-subsection">
                    <h3>활성 실행 내역</h3>
                    <div className="admin-table">
                      {agentRuns.length === 0 && <p className="admin-empty">현재 활성 Agent 실행 내역이 없습니다.</p>}
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
                  </div>
                  <div className="admin-subsection">
                    <h3>숨김 처리된 Agent 대화 내역</h3>
                    <div className="admin-table">
                      {hiddenAgentRuns.length === 0 && <p className="admin-empty">현재 숨김 처리된 Agent 대화 내역이 없습니다.</p>}
                      {hiddenAgentRuns.map((run) => (
                        <article className="admin-row" key={run.id}>
                          <div>
                            <strong>#{run.id} · {run.runType}</strong>
                            <span>{run.status} · user #{run.userId}</span>
                            <small>숨김: {run.hiddenAt ?? "unknown"} · {run.errorMessage ?? run.summary}</small>
                          </div>
                          <div className="admin-actions">
                            <button
                              className="is-danger"
                              type="button"
                              onClick={() => {
                                if (!window.confirm("이 Agent 대화 내역을 영구삭제할까요? 메시지, 단계, 근거 데이터도 함께 정리됩니다.")) return;
                                void runAction(
                                  () => hardDeleteAdminAgentRun(run.id),
                                  "Agent 대화 내역을 영구삭제했습니다.",
                                );
                              }}
                            >
                              <IonIcon icon={trashOutline} />
                              <span>영구삭제</span>
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
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
