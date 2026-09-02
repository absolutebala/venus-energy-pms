import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const supabase = createClient();

export interface AttendanceLog {
  id: string;
  userId: string;
  logDate: string;
  checkInAt: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkOutAt: string | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  workMode: 'office' | 'home' | null;
  wfhStatus: 'pending' | 'approved' | 'rejected' | null;
}

function mapRow(row: any): AttendanceLog {
  return {
    id: row.id,
    userId: row.user_id,
    logDate: row.log_date,
    checkInAt: row.check_in_at,
    checkInLat: row.check_in_lat,
    checkInLng: row.check_in_lng,
    checkOutAt: row.check_out_at,
    checkOutLat: row.check_out_lat,
    checkOutLng: row.check_out_lng,
    workMode: row.work_mode,
    wfhStatus: row.wfh_status,
  };
}

// Haversine formula — distance in meters between two lat/lng points
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getPositionOnce(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

// enableHighAccuracy forces a GPS-level fix, which desktops/laptops without a GPS chip often
// can't get at all (falling back to slow/unreliable OS WiFi-positioning) — causing exactly the
// "Could not determine your location" failure. For a 250m office-radius check we don't need GPS
// precision, so try the fast/lenient method first, and only fall back to high-accuracy if that
// genuinely fails — this fixes the common case without giving up on the rare case that needs it.
function getPosition(): Promise<GeolocationPosition> {
  return new Promise(async (resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    try {
      const pos = await getPositionOnce({ enableHighAccuracy: false, timeout: 10000 });
      resolve(pos);
      return;
    } catch (err: any) {
      if (err.code === err.PERMISSION_DENIED) {
        reject(new Error('Location access denied. Please allow location access to check in/out.'));
        return;
      }
      // First attempt failed (not permission-related) — retry once with high accuracy / longer timeout
      try {
        const pos = await getPositionOnce({ enableHighAccuracy: true, timeout: 15000 });
        resolve(pos);
      } catch (err2: any) {
        if (err2.code === err2.PERMISSION_DENIED) {
          reject(new Error('Location access denied. Please allow location access to check in/out.'));
        } else {
          reject(new Error('Could not determine your location. Please check that Location Services are enabled for your browser (in your device/OS settings), then try again.'));
        }
      }
    }
  });
}

interface AttendanceContextType {
  todayLog: AttendanceLog | null;
  loading: boolean;
  checkingIn: boolean;
  checkingOut: boolean;
  checkIn: () => Promise<{ success: boolean; error?: string; workMode?: 'office' | 'home' }>;
  checkOut: () => Promise<{ success: boolean; error?: string }>;
}

const AttendanceContext = createContext<AttendanceContextType>({
  todayLog: null,
  loading: true,
  checkingIn: false,
  checkingOut: false,
  checkIn: async () => ({ success: false, error: 'Not initialized' }),
  checkOut: async () => ({ success: false, error: 'Not initialized' }),
});

// toISOString() converts to UTC — for IST (UTC+5:30), local midnight becomes 18:30 the PREVIOUS
// day in UTC, silently shifting the date back by one for anyone checking attendance for "today".
// en-CA locale formats as YYYY-MM-DD directly in the given timezone, avoiding the UTC conversion.
function todayStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function AttendanceProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [todayLog, setTodayLog] = useState<AttendanceLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [office, setOffice] = useState<{ latitude: number; longitude: number; radius_meters: number } | null>(null);

  const fetchToday = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from('attendance_logs').select('*')
      .eq('user_id', profile.id).eq('log_date', todayStr()).maybeSingle();
    setTodayLog(data ? mapRow(data) : null);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  useEffect(() => {
    supabase.from('office_locations').select('latitude,longitude,radius_meters').limit(1).maybeSingle()
      .then(({ data }) => { if (data) setOffice(data as any); });
  }, []);

  const checkIn = useCallback(async () => {
    if (!profile?.id) return { success: false, error: 'Not logged in' };
    setCheckingIn(true);
    try {
      const pos = await getPosition();
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      let workMode: 'office' | 'home' = 'home';
      if (office) {
        const dist = distanceMeters(lat, lng, office.latitude, office.longitude);
        workMode = dist <= office.radius_meters ? 'office' : 'home';
      }
      const payload: any = {
        user_id: profile.id, log_date: todayStr(),
        check_in_at: new Date().toISOString(), check_in_lat: lat, check_in_lng: lng,
        work_mode: workMode, wfh_status: workMode === 'home' ? 'pending' : null,
      };
      const { data, error } = await supabase.from('attendance_logs')
        .upsert(payload, { onConflict: 'user_id,log_date' }).select().single();
      if (error) return { success: false, error: error.message };
      setTodayLog(mapRow(data));
      return { success: true, workMode };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setCheckingIn(false);
    }
  }, [profile?.id, office]);

  const checkOut = useCallback(async () => {
    if (!profile?.id || !todayLog) return { success: false, error: 'Not checked in' };
    setCheckingOut(true);
    try {
      const pos = await getPosition();
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      const { data, error } = await supabase.from('attendance_logs')
        .update({ check_out_at: new Date().toISOString(), check_out_lat: lat, check_out_lng: lng, updated_at: new Date().toISOString() })
        .eq('id', todayLog.id).select().single();
      if (error) return { success: false, error: error.message };
      setTodayLog(mapRow(data));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setCheckingOut(false);
    }
  }, [profile?.id, todayLog]);

  return (
    <AttendanceContext.Provider value={{ todayLog, loading, checkingIn, checkingOut, checkIn, checkOut }}>
      {children}
    </AttendanceContext.Provider>
  );
}

export const useAttendance = () => useContext(AttendanceContext);
