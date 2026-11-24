import { AppController } from './ui/AppController';

let controller: AppController | null = null;

function bootstrap(): void {
  const root = document.getElementById('root');
  if (!root) return;
  controller = new AppController(root);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

window.addEventListener('beforeunload', () => {
  controller?.dispose();
  controller = null;
});
