import { redirect } from 'next/navigation';

export default function ConsultantRootRedirect() {
  redirect('/consultant/dashboard');
}