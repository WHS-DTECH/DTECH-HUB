using System.Diagnostics;
using System.Threading;
using System.Windows.Forms;

namespace DTECHHubTray;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        using var singleInstanceMutex = new Mutex(true, "DTECHHubTray.Singleton", out var isPrimaryInstance);
        if (!isPrimaryInstance)
        {
            MessageBox.Show("DTECH Hub Tray is already running.", "DTECH Hub Tray", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        ApplicationConfiguration.Initialize();
        Application.Run(new TrayApplicationContext(args));
    }
}
