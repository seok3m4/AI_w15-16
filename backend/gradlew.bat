@echo off
setlocal

set APP_BASE_NAME=%~n0
set APP_HOME=%~dp0
set CLASSPATH=%APP_HOME%gradle\wrapper\gradle-wrapper.jar

if "%JAVA_HOME%"=="" goto noJavaHome

set JAVA_EXE=%JAVA_HOME%\bin\java.exe
if exist "%JAVA_EXE%" goto execute

echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME% 1>&2
echo Install JDK 21 or set JAVA_HOME correctly. 1>&2
exit /b 1

:noJavaHome
set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if errorlevel 1 (
  echo ERROR: Java is not available. Install JDK 21 or set JAVA_HOME. 1>&2
  exit /b 1
)

:execute
"%JAVA_EXE%" %JAVA_OPTS% %GRADLE_OPTS% -Dorg.gradle.appname=%APP_BASE_NAME% -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
endlocal
