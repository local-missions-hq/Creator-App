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
        { icon: 'logo-apple', label: 'Apple', primary: true },
        { icon: 'logo-google', label: 'Google' },
        { icon: 'logo-microsoft', label: 'Microsoft' },
        { icon: 'mail-outline', label: 'email' },
      ]}
      role="creator"
    />
  );
}
