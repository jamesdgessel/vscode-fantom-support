# Fantom Support Extension for Visual Studio Code

This extension enhances the development experience for the Fantom programming language in Visual Studio Code, offering essential tools for productivity and better code management.

This offers additions to syntax highlighting, but also implements a language server enabling
major additional features. 

**Note this is a brand new beta release! Please report any errors on the github repo.** 

## Features

- **Syntax Highlighting**: Builds on the existing syntax highlighting provided by Matthew and AMckay, adding highlights for classes, methods, fields, types, and variables (beta) using semantic tokens. 
- **Outline View**: Easily navigate your Fantom files with a structured outline for classes, methods, and fields.
- **Fantom Docs**: Navigable fantom docs, right within vscode. 
- **Hover Documentation**: Hover over classes, types, methods, fields to view information. 

## Features In Development
- **Auto-Completion**: Intelligent code suggestions tailored to Fantom, improving coding speed and accuracy.
- **Code Snippets**: Predefined snippets for common Fantom constructs, reducing repetitive typing.
- **Dynamic Updates**: Real-time syntax highlighting for variable declarations and usage instances.
- **Customizable Settings**: Enable or disable syntax highlighting elements directly from the settings menu.
- **Code Formatting**: So you're always up to Brian's standards ;) 

## Requirements

- Visual Studio Code (latest version recommended).
- Ensure you have Fantom installed and configured on your system.
- Ensure you have FAN_HOME in your path, otherwise docs will not work. 
- Compatible with Windows systems where Fantom scripts are run.

## Extension Settings

Not documented yet :) 

## Known Issues

- **Outline View Limitations**: Currently outlines only classes, fields, and methods. Expanding this feature is in tbd.
- **Syntax Highlighting**: I've only tested on some small codebases, I know there will be some issues that pop up. I prefer it working 80% of the time than 0%, so I went for it even though it was quite complicated. 

If you encounter any issues, please report them on the GitHub repository.

## Release Notes

### 1.0.0
- Initial release.
- Features include syntax highlighting, outline view, and basic auto-completion.

## Contributing

We welcome contributions! If you’d like to add features, fix bugs, or improve the extension, please open a pull request or file an issue.

**Enjoy coding with Fantom!**