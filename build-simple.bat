@echo off
echo Setting up environment...
set JAVA_HOME=C:\Program Files\Java\jdk-17
set PATH=%JAVA_HOME%\bin;%PATH%

echo Checking Java version...
java -version

echo Building APK...
cd /d "H:\布鲁计划\代码\blue-plan\android"
call gradlew clean assembleDebug

echo Done!
pause