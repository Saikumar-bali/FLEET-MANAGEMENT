import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyDriverProfile } from '../../services/api';
import type { DriverPortalProfile } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { StatusBadge } from '../../components/StatusBadge';

export function DriverProfilePage() {
  const auth = useAuth();
  const [profile, setProfile] = useState<DriverPortalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.accessToken) return;
    setLoading(true);
    getMyDriverProfile(auth.accessToken)
      .then((res) => setProfile(res.data))
      .catch((e) => setError(e.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [auth.accessToken]);

  if (loading) return <LoadingState message="Loading your profile..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!profile) return <ErrorState message="Profile not found." />;

  return (
    <section className="page-content">
      <PageHeader
        eyebrow="Driver Portal"
        title="My Profile"
        description="Your driver profile information."
      />
      <article className="card">
        <div style={{ padding: '1rem' }}>
          <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <p className="detail-label">Name</p>
              <p className="detail-value">{profile.name}</p>
            </div>
            <div>
              <p className="detail-label">Status</p>
              <StatusBadge status={profile.status} />
            </div>
            <div>
              <p className="detail-label">Mobile</p>
              <p className="detail-value">{profile.mobile}</p>
            </div>
            <div>
              <p className="detail-label">Alternate Mobile</p>
              <p className="detail-value">{profile.alternateMobile || '—'}</p>
            </div>
            <div>
              <p className="detail-label">License Number</p>
              <p className="detail-value">{profile.licenseNumber}</p>
            </div>
            <div>
              <p className="detail-label">License Expiry</p>
              <p className="detail-value">{profile.licenseExpiry ? new Date(profile.licenseExpiry).toLocaleDateString() : '—'}</p>
            </div>
            <div>
              <p className="detail-label">Address</p>
              <p className="detail-value">{profile.address || '—'}</p>
            </div>
            <div>
              <p className="detail-label">Emergency Contact</p>
              <p className="detail-value">{profile.emergencyContact || '—'}</p>
            </div>
            <div>
              <p className="detail-label">Experience</p>
              <p className="detail-value">{profile.experienceYears ? `${profile.experienceYears} years` : '—'}</p>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
