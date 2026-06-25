import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { FuelQuickEntryForm } from '../components/fuel/FuelQuickEntryForm';

export function FuelEntryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  return (
    <section className="page-content">
      <PageHeader
        title={isNew ? 'Create Fuel Entry' : 'Fuel Entry Detail'}
        description={isNew ? 'Quick and easy fuel entry for drivers' : 'View and manage fuel entry'}
      />
      <FuelQuickEntryForm
        onSuccess={() => navigate('/fuel')}
        onCancel={() => navigate('/fuel')}
      />
    </section>
  );
}
