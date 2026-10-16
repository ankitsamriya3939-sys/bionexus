/**
 * BioNexus Studio Client-Side Router Utilities
 * Provides route-to-tab and tab-to-route mappings supporting direct entry and refresh.
 */

export function getTabFromPath(pathname) {
  if (!pathname) return 'home';
  const cleanPath = pathname.toLowerCase().replace(/\/$/, '') || '/';
  switch (cleanPath) {
    case '/':
    case '/home':
      return 'home';
    case '/genome':
      return 'genome';
    case '/evidence':
      return 'evidence';
    case '/primer-design':
    case '/primer-designer':
    case '/primer':
      return 'primer-design';
    case '/ncbi':
      return 'ncbi';
    case '/blast':
      return 'blast';
    case '/sequence-analysis':
    case '/analysis':
      return 'analysis';
    case '/alignment':
      return 'alignment';
    case '/phylogenetics':
    case '/phylo':
      return 'phylo';
    case '/protein-structure':
    case '/protein':
      return 'protein';
    case '/lab-utilities':
    case '/utilities':
      return 'utilities';
    case '/dashboard':
      return 'dashboard';
    default:
      return 'home';
  }
}

export function getPathFromTab(tab) {
  switch (tab) {
    case 'home': return '/';
    case 'genome': return '/genome';
    case 'evidence': return '/evidence';
    case 'primer-design':
    case 'primer': return '/primer-design';
    case 'ncbi': return '/ncbi';
    case 'blast': return '/blast';
    case 'analysis': return '/sequence-analysis';
    case 'alignment': return '/alignment';
    case 'phylo': return '/phylogenetics';
    case 'protein': return '/protein-structure';
    case 'utilities': return '/lab-utilities';
    case 'dashboard': return '/dashboard';
    default: return '/';
  }
}
