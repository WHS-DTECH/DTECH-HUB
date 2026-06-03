using System.Diagnostics;
using System.Drawing;
using Microsoft.Web.WebView2.WinForms;

namespace DTECHHubTray;

internal sealed class TrayApplicationContext : ApplicationContext
{
    private const string HubHomeUrl = "https://dtech-hub2.onrender.com/";
    private const string HubAutoLoginUrl = "https://dtech-hub2.onrender.com/?autologin=1";

    private readonly NotifyIcon _notifyIcon;
    private readonly ToolStripMenuItem _startupMenuItem;

    private HubWindow? _hubWindow;
    private bool _isExiting;

    public TrayApplicationContext(string[] args)
    {
        var contextMenu = new ContextMenuStrip();

        var openItem = new ToolStripMenuItem("Open DTECH Hub", null, (_, _) => OpenHub(autologin: false));
        var signInItem = new ToolStripMenuItem("Open And Sign In", null, (_, _) => OpenHub(autologin: true));
        _startupMenuItem = new ToolStripMenuItem("Run At Startup", null, (_, _) => ToggleStartup())
        {
            Checked = StartupRegistration.IsEnabled(),
            CheckOnClick = false
        };
        var restartItem = new ToolStripMenuItem("Restart Tray App", null, (_, _) => RestartTrayApp());
        var exitItem = new ToolStripMenuItem("Exit", null, (_, _) => ExitTrayApp());

        contextMenu.Items.Add(openItem);
        contextMenu.Items.Add(signInItem);
        contextMenu.Items.Add(new ToolStripSeparator());
        contextMenu.Items.Add(_startupMenuItem);
        contextMenu.Items.Add(restartItem);
        contextMenu.Items.Add(new ToolStripSeparator());
        contextMenu.Items.Add(exitItem);

        _notifyIcon = new NotifyIcon
        {
            Text = "DTECH Hub",
            Icon = LoadTrayIcon(),
            Visible = true,
            ContextMenuStrip = contextMenu
        };

        _notifyIcon.DoubleClick += (_, _) => OpenHub(autologin: false);

        var hasAutorunArg = args.Any(arg => string.Equals(arg, "--autorun", StringComparison.OrdinalIgnoreCase));
        var hasOpenArg = args.Any(arg => string.Equals(arg, "--open", StringComparison.OrdinalIgnoreCase));
        var hasSignInArg = args.Any(arg => string.Equals(arg, "--signin", StringComparison.OrdinalIgnoreCase));

        if (hasAutorunArg || hasOpenArg || hasSignInArg)
        {
            OpenHub(autologin: hasSignInArg || hasAutorunArg);
        }
    }

    private static Icon LoadTrayIcon()
    {
        try
        {
            var iconPath = Path.Combine(AppContext.BaseDirectory, "Assets", "favicon.ico");
            if (File.Exists(iconPath))
            {
                return new Icon(iconPath);
            }
        }
        catch
        {
        }

        return SystemIcons.Application;
    }

    private void OpenHub(bool autologin)
    {
        var targetUrl = autologin ? HubAutoLoginUrl : HubHomeUrl;

        if (_hubWindow is null || _hubWindow.IsDisposed)
        {
            _hubWindow = new HubWindow(targetUrl);
            _hubWindow.FormClosing += HubWindowOnFormClosing;
            _hubWindow.Show();
            _hubWindow.Activate();
            return;
        }

        _hubWindow.Show();
        if (_hubWindow.WindowState == FormWindowState.Minimized)
        {
            _hubWindow.WindowState = FormWindowState.Normal;
        }

        _hubWindow.BringToFront();
        _hubWindow.Focus();
        _hubWindow.Navigate(targetUrl);
    }

    private void HubWindowOnFormClosing(object? sender, FormClosingEventArgs e)
    {
        if (_isExiting)
        {
            return;
        }

        e.Cancel = true;
        _hubWindow?.Hide();
    }

    private void ToggleStartup()
    {
        try
        {
            var enable = !_startupMenuItem.Checked;
            StartupRegistration.SetEnabled(enable);
            _startupMenuItem.Checked = StartupRegistration.IsEnabled();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Could not update startup setting.\n\n{ex.Message}", "DTECH Hub Tray", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            _startupMenuItem.Checked = StartupRegistration.IsEnabled();
        }
    }

    private void RestartTrayApp()
    {
        var executablePath = Environment.ProcessPath;
        if (!string.IsNullOrWhiteSpace(executablePath))
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = executablePath,
                UseShellExecute = true
            });
        }

        ExitTrayApp();
    }

    private void ExitTrayApp()
    {
        _isExiting = true;

        if (_hubWindow is not null && !_hubWindow.IsDisposed)
        {
            _hubWindow.FormClosing -= HubWindowOnFormClosing;
            _hubWindow.Close();
            _hubWindow.Dispose();
            _hubWindow = null;
        }

        _notifyIcon.Visible = false;
        _notifyIcon.Dispose();

        ExitThread();
    }
}

internal sealed class HubWindow : Form
{
    private readonly WebView2 _webView;

    public HubWindow(string initialUrl)
    {
        Text = "DTECH Hub";
        Width = 1320;
        Height = 860;
        StartPosition = FormStartPosition.CenterScreen;

        _webView = new WebView2
        {
            Dock = DockStyle.Fill
        };

        Controls.Add(_webView);
        Shown += async (_, _) => await EnsureInitializedAndNavigate(initialUrl);
    }

    public void Navigate(string url)
    {
        if (_webView.CoreWebView2 is not null)
        {
            _webView.CoreWebView2.Navigate(url);
            return;
        }

        _ = EnsureInitializedAndNavigate(url);
    }

    private async Task EnsureInitializedAndNavigate(string url)
    {
        await _webView.EnsureCoreWebView2Async();
        _webView.CoreWebView2.Navigate(url);
    }
}
