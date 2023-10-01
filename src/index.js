const vscode = require("vscode");
const { DataProvider } = require("./dataProvider");
const { GithubIntegration } = require("./githubIntegration");
const { checkAndShowWeeklyNotification } = require("./utils");
const { CHECK_NOTIFICATION_FREQUENCY } = require("./constants");

/**
 * @param {vscode.ExtensionContext} context
 *
 */

async function activate(context) {
  try {
    const dataProvider = new DataProvider();
    const githubProvider = new GithubIntegration(context);

    checkAndShowWeeklyNotification(context);
    setInterval(async () => {
      checkAndShowWeeklyNotification(context);
    }, CHECK_NOTIFICATION_FREQUENCY);

    context.subscriptions.push(registerRefreshEntryCommand(dataProvider));
    context.subscriptions.push(registerDeleteProjectCommand(dataProvider));
    registerSaveCommand(dataProvider, githubProvider);
    context.subscriptions.push(registerAddProjectCommand(dataProvider));

    const treeview = vscode.window.createTreeView("devtrackr", {
      treeDataProvider: dataProvider,
    });

    registerOpenCommand(dataProvider);
    context.subscriptions.push(registerStoreGithubTokenCommand(githubProvider));
    context.subscriptions.push(treeview);
  } catch (e) {}
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};

function registerRefreshEntryCommand(dataProvider) {
  return vscode.commands.registerCommand(
    "devtrackr.refreshEntry",
    async function () {
      dataProvider.refresh();
      vscode.commands.executeCommand("workbench.action.reloadExtension");
    }
  );
}

function registerDeleteProjectCommand(dataProvider) {
  return vscode.commands.registerCommand(
    "devtrackr.deleteProject",
    async ({ label }) => {
      await dataProvider.deleteProject(label);
    }
  );
}

function registerSaveCommand(dataProvider, githubProvider) {
  vscode.commands.registerCommand("devtrackr.save", async () => {
    await githubProvider.setCredentials();

    if (!Object.keys(dataProvider.projects).length) {
      return vscode.window.showInformationMessage(
        `Please add project then click on save button`
      );
    }

    if (!(await githubProvider.getSecrets())) {
      return vscode.window.showErrorMessage(
        `Please set your GitHub personal access token and username by clicking on "Github Config" Button`
      );
    }

    await githubProvider.processProjects(dataProvider);
  });
}

function registerAddProjectCommand(dataProvider) {
  return vscode.commands.registerCommand(
    "devtrackr.addProject",
    async function () {
      const folderName = await vscode.window.showInputBox({
        prompt: "Enter project name",
      });

      if (!folderName) {
        return;
      }

      await dataProvider.addProject(folderName);
    }
  );
}

function registerOpenCommand(dataProvider) {
  vscode.commands.registerCommand("devtrackr.open", (dependency) => {
    dataProvider.openProject(dependency.project);
  });
}

function registerStoreGithubTokenCommand(githubProvider) {
  return vscode.commands.registerCommand(
    "devtrackr.storeGithubToken",
    async () => {
      const token = await vscode.window.showInputBox({
        prompt: "Enter your GitHub personal access token",
        password: true,
      });

      const username = await vscode.window.showInputBox({
        prompt: "Enter your username",
      });

      if (username && token) {
        await githubProvider.setSecrets(username, token);
      } else {
        vscode.window.showInformationMessage(
          `Please don't leave it github username or token empty`
        );
      }
    }
  );
}