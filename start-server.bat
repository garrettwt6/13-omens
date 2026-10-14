@echo off
setlocal
 title 13 Omens Local Server
pushd "%~dp0"
if errorlevel 1 goto folder_error

where node.exe >nul 2>&1
if errorlevel 1 goto missing_node
where npm.cmd >nul 2>&1
if errorlevel 1 goto missing_node
if not exist "package.json" goto missing_project
if not exist "server.cjs" goto missing_project

node -e "require.resolve('ws')" >nul 2>&1
if errorlevel 1 goto install
 goto start

:install
echo Installing server dependencies...
call npm.cmd ci
if errorlevel 1 goto failed

:start
echo Starting 13 Omens. Keep this window open while playing.
echo Press Ctrl+C to stop the server.
echo.
call npm.cmd start
if errorlevel 1 goto failed
popd
endlocal
exit /b 0

:missing_node
echo Node.js or npm was not found. Install Node.js 22 or newer from https://nodejs.org/
echo Then reopen this batch file.
goto failed

:missing_project
echo Put this batch file in the repository folder containing package.json and server.cjs.
goto failed

:failed
echo.
echo The server could not start. Read the error above.
pause
popd
endlocal
exit /b 1

:folder_error
echo Could not open the folder containing this batch file.
pause
endlocal
exit /b 1
