import { useOutletContext } from 'react-router-dom';
import DocumentsList from '../../components/DocumentsList';

export default function DocumentsTabRoute() {
  const { ret } = useOutletContext();
  return <DocumentsList returnId={ret.id} />;
}
