import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xruckfgtrvrouqyyecco.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhydWNrZmd0cnZyb3VxeXllY2NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODc1NDMsImV4cCI6MjA5MTE2MzU0M30.5HgAKiT6FVEjmp6h5cFTDjGNaCH0vycoH-OMzAAKGBs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
