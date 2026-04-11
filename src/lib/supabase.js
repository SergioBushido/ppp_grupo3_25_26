import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { enviroment } from '../config/enviroment';

const supabaseUrl = enviroment.SUPABASE_URL;
const supabaseAnonKey = enviroment.SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
