@echo off
setlocal
set DIR=%~dp0
cd /d "%DIR%"
call gradle %*
