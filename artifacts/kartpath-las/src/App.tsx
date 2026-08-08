import { useEffect, useRef } from 'react';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Redirect, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import Staff from '@/pages/staff';
import { About, Advertise, CrooksCorner, Directory, Editions, Events, Lifestyle, Nonprofit, People, PublicHome } from '@/pages/public-pages';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#d7a23a',
    colorForeground: '#1d2521',
    colorMutedForeground: '#657066',
    colorDanger: '#b8583f',
    colorBackground: '#f4f0e7',
    colorInput: '#fffdf8',
    colorInputForeground: '#1d2521',
    colorNeutral: '#cfc8ba',
    fontFamily: 'Space Grotesk, sans-serif',
    borderRadius: '0px',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#f4f0e7] border border-[#cfc8ba] rounded-none w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'font-display text-[#1d2521]',
    headerSubtitle: 'font-ui text-[#657066]',
    socialButtonsBlockButtonText: 'font-ui text-[#1d2521]',
    formFieldLabel: 'font-ui text-[#1d2521]',
    footerActionLink: 'font-ui text-[#b8583f]',
    footerActionText: 'font-ui text-[#657066]',
    dividerText: 'font-ui text-[#657066]',
    formButtonPrimary: 'font-ui uppercase tracking-[.12em] bg-[#25483e] hover:bg-[#1d2521]',
    formFieldInput: 'font-ui border-[#cfc8ba] bg-[#fffdf8] text-[#1d2521]',
    formFieldSuccessText: 'font-ui text-[#25483e]',
    alertText: 'font-ui text-[#b8583f]',
  },
};

function stripBase(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) {
        client.clear();
      }
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, client]);

  return null;
}

function SignInPage() {
  return (
    <div className="las-page flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--pine))] px-4 py-10">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="las-page flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--pine))] px-4 py-10">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function HomeRedirect() {
  return <PublicHome />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/people" component={People} />
      <Route path="/nonprofit" component={Nonprofit} />
      <Route path="/lifestyle" component={Lifestyle} />
      <Route path="/crooks-corner" component={CrooksCorner} />
      <Route path="/events" component={Events} />
      <Route path="/directory" component={Directory} />
      <Route path="/editions" component={Editions} />
      <Route path="/about" component={About} />
      <Route path="/advertise" component={Advertise} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/staff" component={Staff} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => window.history.pushState({}, '', stripBase(to))}
      routerReplace={(to) => window.history.replaceState({}, '', stripBase(to))}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
