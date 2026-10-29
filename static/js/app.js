/**
 * Student Project Finder & Originality Checker
 * Vanilla JavaScript UI Enhancements
 */

document.addEventListener('DOMContentLoaded', function () {
  // Auto-dismiss alerts after 5 seconds if not persistent
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(function (alert) {
    setTimeout(function () {
      alert.style.transition = 'opacity 0.4s ease';
      alert.style.opacity = '0';
      setTimeout(function () {
        if (alert.parentNode) {
          alert.parentNode.removeChild(alert);
        }
      }, 400);
    }, 5000);
  });
});
