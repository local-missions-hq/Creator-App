import { SignInScreen } from '../../components/SignInScreen';

export default function CreatorSignInScreen() {
  return (
    <SignInScreen
      accent="#007c83"
      createLabel="Create creator profile"
      eyebrow="Creator sign in"
      headline="Welcome back"
      onboardingHref="/creator/profile"
      providers={[
        { icon: 'logo-apple', label: 'Apple', primary: true, provider: 'apple' },
        { icon: 'logo-google', label: 'Google', provider: 'google' },
        { icon: 'logo-microsoft', label: 'Microsoft', provider: 'microsoft' },
        { icon: 'mail-outline', label: 'email', provider: 'passwordless_email' },
      ]}
      role="creator"
    />
  );
}
