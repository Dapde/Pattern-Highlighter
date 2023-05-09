#!/bin/sh

# Set variable for the action to be performed.
# 1 - Copy the files from the "chrome" folder to the "firefox" folder (default).
# 2 - Remove the copied files from the "firefox" folder.
# 3 - Display the manual.
action=1

# Boolean switch to indicate whether at least one unexpected argument was given.
unexpected_argument=0

# Iterate through all arguments (including flags).
for arg in "$@"; do
    if [ "$arg" = "-c" ] || [ "$arg" = "--clean" ]; then
        action=2
    elif [ "$arg" = "-h" ] || [ "$arg" = "--help" ]; then
        action=3
    else
        # Output an error message to stderr directly for each unexpected parameter.
        echo >&2 "Unexpected argument: $arg"
        # Set the switch to 1, i.e. to true.
        unexpected_argument=1
    fi
done

# Output a help message if at least one unexpected argument was given.
if [ "$unexpected_argument" -eq 1 ]; then
    echo "Use \"-h\" or \"--help\" to display the manual."
    exit 1
fi

# Get the relative path to the directory of the script.
script_dir=$(dirname "$0")

# Empty the "firefox" folder before copying the files or if a flag for cleaning has been set.
if [ "$action" -eq 1 ] || [ "$action" -eq 2 ]; then
    # Set a variable for the path of the Firefox extension manifest file.
    manifest_file="$script_dir/firefox/manifest.json"
    # Create a copy of the manifest file in memory.
    manifest=$(cat "$manifest_file")
    # Delete the "firefox" folder.
    rm -rf "$script_dir/firefox/"
    # Create a new "firefox" folder.
    mkdir "$script_dir/firefox/"
    # Restore the manifest file using the copy in memory.
    printf "%s\n" "$manifest" >"$manifest_file"
fi

# Perform the requested action.
if [ "$action" -eq 1 ]; then
    # Copy all files from the "chrome" folder to the "firefox" folder without overwriting existing files.
    cp -r -n "$script_dir/chrome/." "$script_dir/firefox/."
    echo "Files have been copied to the \"firefox\" folder."
elif [ "$action" -eq 2 ]; then
    echo "Files have been removed from the \"firefox\" folder."
    exit 0
elif [ "$action" -eq 3 ]; then
    echo "This script copies the missing files for the Firefox version of the extension from the \"chrome\" folder to the \"firefox\" folder."
    echo "Available flags:"
    echo "\t -c, --clean\t Remove the copied files. The \"manifest.json\" file will not be deleted."
    echo "\t -h, --help\t Display this manual."
else
    exit 1
fi

exit 0
