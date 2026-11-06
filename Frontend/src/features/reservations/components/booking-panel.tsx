import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReservationsStore } from '@/stores/reservations-store';
import { theme } from '@/theme';
import { bookingStatus, sessionDateKey } from '@/features/reservations/utils/booking-options';
import type { Session } from '@/services/reservations-service';

type Venue = { id: string; name: string; classes: { id: string; name: string; description: string }[] };
const weekdayFormat = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short' });
const dayFormat = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric' });
const monthFormat = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', month: 'short' });
const fullDateFormat = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long', day: 'numeric', month: 'long' });
const timeFormat = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const timeRange = (s: Session) => `${timeFormat.format(s.startsAt)} – ${timeFormat.format(s.endsAt)}`;

export function BookingPanel({ venue }: { venue: Venue }) {
  const sessions = useReservationsStore(state => state.sessions);
  const items = useReservationsStore(state => state.items);
  const pending = useReservationsStore(state => state.pending);
  const loading = useReservationsStore(state => state.loading);
  const error = useReservationsStore(state => state.error);
  const book = useReservationsStore(state => state.book);
  const load = useReservationsStore(state => state.load);
  const [activityId, setActivityId] = useState(venue.classes[0]?.id);
  const [date, setDate] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [review, setReview] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const activity = venue.classes.find(a => a.id === activityId);
  const options = sessions.filter(s => s.branchId === venue.id && s.activityId === activityId && s.startsAt > now).sort((a, b) => a.startsAt - b.startsAt);
  const dates = options.filter((session, index) => options.findIndex(s => sessionDateKey(s.startsAt) === sessionDateKey(session.startsAt)) === index);
  const activeDate = dates.some(s => sessionDateKey(s.startsAt) === date) ? date : dates[0] ? sessionDateKey(dates[0].startsAt) : null;
  const visible = options.filter(s => sessionDateKey(s.startsAt) === activeDate);
  const selected = visible.find(s => s.id === selectedId);
  const selectable = selected && bookingStatus(selected, items ?? [], now) === 'Disponible';
  const busy = loading || !!pending;

  async function confirm() {
    if (!selected || !selectable || busy) return;
    const success = await book(selected.id);
    if (success) {
      setConfirmation(`${activity?.name} · ${fullDateFormat.format(selected.startsAt)} · ${timeRange(selected)} h`);
      setReview(false);
      setSelectedId(null);
      Alert.alert('Reserva confirmada ✓', 'Ya podés verla en Inicio y en Mis reservas.', [
        { text: 'Seguir explorando', style: 'cancel' },
        { text: 'Ver mis reservas', onPress: () => router.push('/my-reservations') },
      ]);
    }
  }

  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.heading}>Reservá tu clase</Text>
    <Text style={styles.muted}>Elegí una actividad, una fecha y un horario.</Text>
    <View style={styles.tabs} accessibilityRole="tablist">
      {venue.classes.map(a => <Pressable key={a.id} accessibilityRole="tab" accessibilityState={{ selected: a.id === activityId, disabled: busy }}
        disabled={busy} onPress={() => { setActivityId(a.id); setDate(null); setSelectedId(null); setReview(false); setConfirmation(null); }}
        style={[styles.tab, a.id === activityId && styles.activeTab]}>
        <Text style={[styles.tabLabel, a.id === activityId && styles.activeLabel]}>{a.name}</Text>
      </Pressable>)}
    </View>
    <Text style={styles.muted}>{activity?.description}</Text>
    {confirmation ? <View style={styles.notice} accessibilityLiveRegion="polite">
      <Text style={styles.noticeTitle}>Reserva confirmada</Text>
      <Text style={styles.text}>{confirmation}</Text>
      <Text style={styles.muted}>Ya podés verla en Inicio y en Mis reservas.</Text>
    </View> : null}
    {error ? <View style={styles.notice}>
      <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.text}>{error}</Text>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void load(); }} style={styles.textButton}><Text style={styles.link}>Actualizar disponibilidad</Text></Pressable>
    </View> : null}
    {loading ? <ActivityIndicator color={theme.colors.buttonBackground} accessibilityLabel="Cargando horarios" /> : null}
    {!loading && dates.length === 0 ? <Text style={styles.empty}>No hay próximos horarios para esta actividad.</Text> : null}
    {!review ? <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dates}>
        {dates.map(session => {
          const key = sessionDateKey(session.startsAt);
          const active = key === activeDate;
          return <Pressable key={key} accessibilityRole="button" accessibilityLabel={fullDateFormat.format(session.startsAt)}
            accessibilityState={{ selected: active, disabled: busy }} disabled={busy}
            onPress={() => { setDate(key); setSelectedId(null); setConfirmation(null); }} style={[styles.day, active && styles.activeDay]}>
            <Text style={[styles.weekday, active && styles.activeLabel]}>{weekdayFormat.format(session.startsAt).replace('.', '')}</Text>
            <Text style={styles.dayNumber}>{dayFormat.format(session.startsAt)}</Text>
            <Text style={[styles.month, active && styles.activeLabel]}>{monthFormat.format(session.startsAt).replace('.', '')}</Text>
          </Pressable>;
        })}
      </ScrollView>
      {visible[0] ? <View style={styles.agendaHeader}>
        <Text style={styles.dateTitle}>{fullDateFormat.format(visible[0].startsAt)}</Text>
        <Text style={styles.small}>Buenos Aires</Text>
      </View> : null}
      <View style={styles.agenda}>
        {visible.map(session => {
          const status = bookingStatus(session, items ?? [], now);
          const disabled = status !== 'Disponible' || busy;
          const active = session.id === selectedId;
          return <View key={session.id} style={styles.slotRow}>
            <View style={styles.timeRail}><Text style={styles.railTime}>{timeFormat.format(session.startsAt)}</Text><View style={styles.railLine} /></View>
            <Pressable accessibilityRole="button" accessibilityLabel={`${activity?.name}, ${timeRange(session)}, ${status}`}
              accessibilityState={{ selected: active, disabled }} disabled={disabled}
              onPress={() => { setSelectedId(session.id); setConfirmation(null); }}
              style={({ pressed }) => [styles.slot, active && styles.selectedSlot, status !== 'Disponible' && styles.unavailableSlot, pressed && styles.pressed]}>
              <View style={styles.slotHeader}><Text style={styles.slotTime}>{timeRange(session)}</Text><View style={[styles.radio, active && styles.selectedRadio]}>{active ? <View style={styles.radioDot} /> : null}</View></View>
              <Text style={[styles.slotStatus, active && styles.activeLabel]}>{status} · {Math.round((session.endsAt - session.startsAt) / 60000)} min</Text>
            </Pressable>
          </View>;
        })}
      </View>
      <Text style={styles.small}>Las clases reservadas o con horarios superpuestos no se pueden seleccionar.</Text>
      <View style={styles.footer}>
        <Text style={styles.muted}>{selected ? `${activity?.name} · ${timeRange(selected)} h` : 'Seleccioná un horario para continuar'}</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !selectable || busy }} disabled={!selectable || busy}
          onPress={() => setReview(true)} style={({ pressed }) => [styles.primary, (!selectable || busy) && styles.disabled, pressed && styles.pressed]}>
          <Text style={styles.primaryLabel}>Continuar</Text>
        </Pressable>
      </View>
    </> : <View style={styles.review}>
      <Text style={styles.dateTitle}>Revisá tu reserva</Text>
      <View style={styles.reviewDetails}>
        <Text style={styles.small}>ACTIVIDAD</Text><Text style={styles.reviewValue}>{activity?.name}</Text>
        <Text style={styles.small}>SEDE</Text><Text style={styles.text}>{venue.name}</Text>
        <Text style={styles.small}>FECHA Y HORARIO</Text>
        <Text style={styles.text}>{selected ? fullDateFormat.format(selected.startsAt) : 'El horario ya no está disponible'}</Text>
        {selected ? <Text style={styles.reviewValue}>{timeRange(selected)} h</Text> : null}
        <Text style={styles.small}>Horario de Buenos Aires</Text>
      </View>
      <Text style={styles.muted}>Podés cancelar tu reserva antes del inicio de la clase.</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !selectable || busy, busy: !!pending }} disabled={!selectable || busy}
        onPress={() => { void confirm(); }} style={({ pressed }) => [styles.primary, (!selectable || busy) && styles.disabled, pressed && styles.pressed]}>
        {pending ? <ActivityIndicator color={theme.colors.text} /> : null}<Text style={styles.primaryLabel}>{pending ? 'Reservando…' : 'Confirmar reserva'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => setReview(false)} style={styles.textButton}><Text style={styles.link}>Cambiar horario</Text></Pressable>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  panel: { gap: 16, borderTopWidth: 1, borderTopColor: '#333333', paddingTop: 24 },
  heading: { color: theme.colors.text, fontSize: 24, fontWeight: '700' },
  text: { color: theme.colors.text, fontSize: 15, lineHeight: 22 },
  muted: { color: '#b9bbc1', fontSize: 14, lineHeight: 21 },
  small: { color: '#a8a8ad', fontSize: 12, lineHeight: 18 },
  tabs: { flexDirection: 'row', backgroundColor: '#242424', padding: 4, borderRadius: 12, gap: 4 },
  tab: { flex: 1, minHeight: 48, paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  activeTab: { backgroundColor: theme.colors.buttonBackground },
  tabLabel: { color: '#b9bbc1', fontSize: 15, fontWeight: '600' },
  activeLabel: { color: theme.colors.text },
  dates: { gap: 10, paddingVertical: 4 },
  day: { minWidth: 64, minHeight: 94, borderRadius: 14, borderWidth: 1, borderColor: '#3b3b3b', padding: 12, gap: 4, alignItems: 'center', backgroundColor: '#202020' },
  activeDay: { borderColor: theme.colors.buttonBackground, backgroundColor: '#461b1b' },
  weekday: { color: '#b9bbc1', fontSize: 12, textTransform: 'capitalize' },
  dayNumber: { color: theme.colors.text, fontSize: 25, fontWeight: '700', fontVariant: ['tabular-nums'] },
  month: { color: '#b9bbc1', fontSize: 12, textTransform: 'capitalize' },
  agendaHeader: { gap: 4 },
  dateTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '600', textTransform: 'capitalize' },
  agenda: { gap: 12 },
  slotRow: { flexDirection: 'row', gap: 12 },
  timeRail: { width: 48, alignItems: 'center', gap: 8, paddingTop: 18 },
  railTime: { color: '#b9bbc1', fontSize: 12, fontVariant: ['tabular-nums'] },
  railLine: { flex: 1, width: 1, backgroundColor: '#3b3b3b', minHeight: 28 },
  slot: { flex: 1, minHeight: 90, backgroundColor: '#222222', borderColor: '#3b3b3b', borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  selectedSlot: { backgroundColor: '#461b1b', borderColor: theme.colors.buttonBackground },
  unavailableSlot: { backgroundColor: '#1b1b1b', opacity: 0.5 },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  slotTime: { color: theme.colors.text, fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'], flexShrink: 1 },
  slotStatus: { color: '#b9bbc1', fontSize: 13 },
  radio: { width: 20, height: 20, borderWidth: 1, borderColor: '#777777', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  selectedRadio: { borderColor: theme.colors.buttonBackground },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.buttonBackground },
  footer: { gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#333333' },
  primary: { flexDirection: 'row', gap: 10, minHeight: 52, backgroundColor: theme.colors.buttonBackground, borderRadius: 26, padding: 16, alignItems: 'center', justifyContent: 'center' },
  primaryLabel: { color: theme.colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
  textButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: 8 },
  link: { color: '#ff7373', fontSize: 14, fontWeight: '500' },
  review: { padding: 18, backgroundColor: '#202020', borderRadius: 16, gap: 18 },
  reviewDetails: { gap: 8 },
  reviewValue: { color: theme.colors.text, fontSize: 21, fontWeight: '600' },
  notice: { backgroundColor: '#252525', borderRadius: 12, borderLeftWidth: 3, borderLeftColor: theme.colors.buttonBackground, padding: 16, gap: 8 },
  noticeTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '600' },
  empty: { color: '#b9bbc1', padding: 16, fontSize: 14 },
});
