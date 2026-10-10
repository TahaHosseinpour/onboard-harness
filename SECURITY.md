# Security

Onboard Harness is a single-user desktop app. It runs entirely on your own
machine: there is no server to deploy, no account and no telemetry. The only
thing that leaves the machine is the conversation with the model endpoint you
configured yourself.

## What the app protects

| Risk | What is done about it |
|---|---|
| Another program or a web page on your machine calling the engine | The engine listens on `127.0.0.1` only, on a random port, and requires a random token that the desktop shell creates on every start and passes in a header. Requests whose `Host` is not this machine (DNS rebinding) or whose `Origin` is not the app are refused before anything else. |
| API keys leaking | Keys are stored in the operating system's keychain (Windows Credential Manager, macOS Keychain), never in the workspace or in settings files. The API never returns them. Commands the agent runs get a minimal environment without them. |
| The agent reaching outside its folder | File tools see the workspace as `/` and cannot go above it. A drive root or your home folder cannot be opened as a workspace. Shell commands that name a path outside the workspace are refused. |
| The agent doing something you did not want | Every tool call is decided by `.harness/rules.yaml` as allow / ask / deny before it runs. Writing files and running commands ask by default. Rules are matched on the normalised path, so a rule cannot be dodged by spelling a path differently. A missing or broken rules file never means "allow everything". |
| The agent loosening its own rules | The agent can never change `rules.yaml` without your approval, in any mode. |
| A file the agent wrote being run by a click | Executable and script files in the workspace are shown in their folder instead of being opened. |
| The page being taken over | The window runs sandboxed, with context isolation, a content security policy, no Node access, no permissions (camera, microphone, …) and no navigation away from the app. |
| The browser tool being used to reach your network or leak data | `browse_page` asks for approval by default, even in workspaces whose rules predate it. It opens only `http(s)` addresses on the public internet - loopback, private and link-local addresses are refused for the page and for everything the page loads. It only reads: no clicking, typing, logging in or downloading. It runs the installed Edge or Chrome with a fresh empty profile, never yours. |
| A malicious archive | Archives are unpacked into a new, empty folder inside the workspace, never over existing files. Entries with `..`, absolute paths or links are refused, and there are ceilings on file count (5000) and unpacked size (1 GB). Nothing that is unpacked is run. |
| Runaway cost | Each task has ceilings on model calls, tool calls, time and (optionally) cost. |

## What it does not protect

Know these before you rely on it:

- **The shell is not a real sandbox.** Commands run on your machine with your
  own permissions. The guards stop accidents and obvious bad ideas; a script
  the agent writes and runs can still read any file you can, and the network
  is not restricted. This is why `execute` asks for approval by default. Read
  a command before you approve it.
- **"Auto" mode removes the approval step.** Use it only on folders whose
  content you trust. Text inside a document can try to instruct the agent
  (prompt injection); the system prompt tells the agent to ignore such text,
  but that is a mitigation, not a guarantee.
- **A web page is untrusted text.** If you approve opening a page, what it
  says reaches the model. An approved address is also a request to that site:
  check that the address the agent wants to open does not carry your data in it.
- **Your prompts and the files the agent reads are sent to the model endpoint
  you configured.** Pick one you trust with that data. Use `https://` for
  anything that is not on your own machine.
- **The workspace is not encrypted.** Task history lives in
  `.harness/runs/` as plain files; anyone who can read the folder can read it.
- **Windows builds are not code-signed** yet, so SmartScreen warns on first run.
  Download releases only from this repository.

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's
"Report a vulnerability" (Security → Advisories) on this repository. Include
the steps to reproduce and the version you used.
