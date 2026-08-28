import { SignInScreen } from '../../components/SignInScreen';

export default function BusinessSignInScreen() {
  return (
    <SignInScreen
      accent="#cf3f1f"
      createLabel="Create business profile"
      eyebrow="Business sign in"
      headline="Create visits that matter"
      onboardingHref="/business/setup"
      providers={[
        { icon: 'logo-microsoft', label: 'Microsoft', primary: true, provider: 'microsoft' },
        { icon: 'logo-google', label: 'Google', provider: 'google' },
        { icon: 'logo-apple', label: 'Apple', provider: 'apple' },
        { icon: 'mail-outline', label: 'email', provider: 'passwordless_email' },
      ]}
      role="business"
    />
  );
}
