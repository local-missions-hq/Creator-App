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
        { icon: 'logo-microsoft', label: 'Microsoft', primary: true },
        { icon: 'logo-google', label: 'Google' },
        { icon: 'logo-apple', label: 'Apple' },
        { icon: 'mail-outline', label: 'email' },
      ]}
      role="business"
    />
  );
}
