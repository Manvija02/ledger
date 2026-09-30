import { useOutletContext } from 'react-router-dom';
import MessagesPanel from '../../components/MessagesPanel';

export default function MessagesTabRoute() {
  const { ret } = useOutletContext();
  return <MessagesPanel returnId={ret.id} ret={ret} />;
}
