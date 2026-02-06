# GEMINI.md

## Project Overview

This project is a TypeScript-based MCP (Model Context Protocol) server that enables interaction with the Bitbucket Cloud API. It allows users to perform actions such as listing pull requests, viewing pull request details and diffs, and posting comments on pull requests. The server is designed to be used with Claude Code, providing a set of tools for seamless integration between the two platforms.

The project is structured with a clear separation of concerns:

-   **`src/index.ts`**: The main entry point of the server, responsible for initializing the MCP server and registering the available tools.
-   **`src/services/bitbucket-client.ts`**: A client for the Bitbucket Cloud API, handling authentication, request signing, and communication with the API endpoints.
-   **`src/tools`**: This directory contains the implementation of the various tools that the server exposes, such as `list-prs`, `get-pr`, `get-pr-diff`, `list-pr-comments`, and `post-pr-comment`. Each tool has a corresponding Zod schema for input validation.
-   **`src/types`**: This directory contains TypeScript types for the Bitbucket API objects.
-   **`src/utils`**: This directory contains utility functions for error handling, logging, and converting Zod schemas to JSON schemas.

## Building and Running

### Build

To build the project, run the following command:

```bash
npm run build
```

This will compile the TypeScript code into JavaScript in the `dist` directory.

### Run

To run the server, use the following command:

```bash
npm start
```

### Development

To run the server in development mode with hot-reloading, use the following command:

```bash
npm run dev
```

### Test

To run the tests, use the following command:

```bash
npm test
```

## Development Conventions

### Coding Style

The project uses TypeScript and follows standard TypeScript and Node.js conventions. It uses ES modules.

### Testing

The project uses Jest for testing. Tests are located in the `tests` directory. To add a new test, create a new file in the `tests/tools` directory with the same name as the tool it is testing.

### Contribution Guidelines

When adding a new tool, the following steps should be followed:

1.  Create a new file in the `src/tools` directory for the new tool.
2.  Define a Zod schema for the tool's input parameters.
3.  Implement the tool's logic in a function that takes the `BitbucketClient` and the parsed input as arguments.
4.  Add the new tool to the `registerTools` function in `src/tools/index.ts`.
5.  Add a test for the new tool in the `tests/tools` directory.
