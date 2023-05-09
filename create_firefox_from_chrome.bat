@echo off

rem Set variable for the action to be performed.
rem 1 - Copy the files from the "chrome" folder to the "firefox" folder (default).
rem 2 - Remove the copied files from the "firefox" folder.
rem 3 - Display the manual.
set action=1

rem Boolean switch to indicate whether at least one unexpected argument was given.
set unexpected_argument=0

rem Iterate through all arguments (including flags).
:args_start
rem Check if the argument is one of the specified flags.
if "%~1"=="-c" goto flag_clean
if "%~1"=="/c" goto flag_clean
if "%~1"=="--clean" goto flag_clean
if "%~1"=="/clean" goto flag_clean

if "%~1"=="-h" goto flag_help
if "%~1"=="/h" goto flag_help
if "%~1"=="--help" goto flag_help
if "%~1"=="/help" goto flag_help
if "%~1"=="-?" goto flag_help
if "%~1"=="/?" goto flag_help

if "%~1"=="" goto args_end

rem Set the switch for unexpected arguments to 1, i.e. true, in case of an unexpected argument.
set unexpected_argument=1
rem Output an error message to stderr directly for each unexpected parameter.
echo Unexpected argument: %~1 1>&2
rem Continue with the next argument.
goto next_argument

:flag_clean
rem Set the `action` variable to 2 if a flag for the cleanup operation was given.
set action=2
rem Continue with the next argument.
goto next_argument

:flag_help
rem Set the `action` variable to 3 if a flag for the help operation was given.
set action=3
rem Continue with the next argument.
goto next_argument

:next_argument
rem Look at the next argument.
shift /1
rem Check the next argument if it is not empty.
if not "%~1" == "" goto args_start
:args_end

rem Check if not one unexpected argument was given. If true, perform the requested action.
if %unexpected_argument% equ 0 goto perform_action

rem Output a help message if at least one unexpected argument was given.
echo Use "/h" or "/help" to display the manual.
rem Exit the script with an error code. 
goto exit_error

:perform_action
rem Get the absolute path to the directory of the script.
set script_dir=%~dp0

rem # Perform the requested action.
if %action% equ 1 goto action_clean_start
if %action% equ 2 goto action_clean_start
if %action% equ 3 goto action_help

rem If the `action` variable somehow has an unexpected value, exit the script with an error code.
goto exit_error

:action_clean_start
rem Set a variable for the path of the Firefox extension manifest file.
set manifest_file=%script_dir%firefox\manifest.json
rem Set a variable for the path of the temporary copy of the Firefox extension manifest file.
set manifest_backup=%script_dir%firefox_manifest.json.bkp
rem Create the temporary copy of the Firefox extension manifest file in the directory of the script.
copy %manifest_file% %manifest_backup% >nul
rem Delete the "firefox" folder.
rmdir %script_dir%firefox\ /s /q
rem Create a new "firefox" folder.
md %script_dir%firefox\

rem Unless the default action was requested, the file copying is to be skipped.
if %action% neq 1 goto action_clean_end
rem Copy all files from the "chrome" folder to the "firefox" folder.
xcopy /s /e /y %script_dir%chrome\* %script_dir%firefox\* >nul

:action_clean_end
rem Restore the manifest file by copying the temporary copy.
copy %manifest_backup% %manifest_file% >nul
rem Remove the temporary copy of the Firefox extension manifest file.
del %manifest_backup%

rem When the files have been copied, the corresponding message should be output.
if %action% equ 1 goto action_copy
rem If only the folder was cleaned, the corresponding message should be output.
echo Files have been removed from the "firefox" folder.
rem Exit the script successfully.
goto exit_success

:action_copy
echo Files have been copied to the "firefox" folder.
rem Exit the script successfully.
goto exit_success

:action_help
echo This script copies the missing files for the Firefox version of the extension from the "chrome" folder to the "firefox" folder.
echo Available flags:
echo.   /c, /clean      Remove the copied files. The "manifest.json" file will not be deleted.
echo.   /?, /h, /help   Display this manual.
rem Exit the script successfully.
goto exit_success

:exit_error
rem Wait for a user input so that the user sees the error message.
pause
exit 1

:exit_success
exit 0
