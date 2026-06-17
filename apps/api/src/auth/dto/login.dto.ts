// 📌 로그인 요청 body 구조. 이메일과 비밀번호를 받아 인증에 사용한다.
export class LoginDto {
  email: string;
  password: string;
}
