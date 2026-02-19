
-- 1. Enum types
CREATE TYPE public.listing_type AS ENUM ('book', 'item', 'service');
CREATE TYPE public.listing_status AS ENUM ('active', 'closed', 'deleted');
CREATE TYPE public.deal_status AS ENUM ('proposed', 'confirmed', 'canceled');
CREATE TYPE public.complaint_status AS ENUM ('new', 'in_review', 'resolved');
CREATE TYPE public.complaint_target_type AS ENUM ('listing', 'user');
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 5. Listings
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type listing_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  photos TEXT[] DEFAULT '{}',
  category_id UUID REFERENCES public.categories(id),
  offering TEXT,
  wanting TEXT,
  status listing_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- 6. Chats
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, user_a, user_b),
  CHECK (user_a <> user_b)
);
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- 7. Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 8. Deals
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES public.profiles(id),
  status deal_status NOT NULL DEFAULT 'proposed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_a <> user_b)
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- 9. Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL,
  text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_id, from_user_id),
  CHECK (from_user_id <> to_user_id),
  CHECK (rating >= 1 AND rating <= 5)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 10. Complaints
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complainant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type complaint_target_type NOT NULL,
  target_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status complaint_status NOT NULL DEFAULT 'new',
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- 11. Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ==========================================
-- HELPER FUNCTIONS (security definer)
-- ==========================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_chat_participant(_chat_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chats
    WHERE id = _chat_id AND (user_a = _user_id OR user_b = _user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_deal_participant(_deal_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deals
    WHERE id = _deal_id AND (user_a = _user_id OR user_b = _user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_deal_confirmed(_deal_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deals WHERE id = _deal_id AND status = 'confirmed'
  )
$$;

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Close listing when deal confirmed
CREATE OR REPLACE FUNCTION public.handle_deal_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'proposed' THEN
    UPDATE public.listings SET status = 'closed' WHERE id = NEW.listing_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deal_confirmed
AFTER UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.handle_deal_confirmed();

-- Validate review: only for confirmed deals
CREATE OR REPLACE FUNCTION public.validate_review()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_deal_confirmed(NEW.deal_id) THEN
    RAISE EXCEPTION 'Reviews are only allowed for confirmed deals';
  END IF;
  IF NOT public.is_deal_participant(NEW.deal_id, NEW.from_user_id) THEN
    RAISE EXCEPTION 'Reviewer must be a deal participant';
  END IF;
  IF NOT public.is_deal_participant(NEW.deal_id, NEW.to_user_id) THEN
    RAISE EXCEPTION 'Reviewee must be a deal participant';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_review
BEFORE INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.validate_review();

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Profiles
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- User roles (only admins manage, users can read own)
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Categories
CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Listings
CREATE POLICY "Anyone can view active listings" ON public.listings FOR SELECT USING (status = 'active' OR author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own listings" ON public.listings FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors update own listings" ON public.listings FOR UPDATE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authors delete own listings" ON public.listings FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Chats
CREATE POLICY "Participants view chats" ON public.chats FOR SELECT TO authenticated USING (user_a = auth.uid() OR user_b = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create chats" ON public.chats FOR INSERT TO authenticated WITH CHECK (user_a = auth.uid() OR user_b = auth.uid());
CREATE POLICY "Admins delete chats" ON public.chats FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Messages
CREATE POLICY "Chat participants view messages" ON public.messages FOR SELECT TO authenticated USING (public.is_chat_participant(chat_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Chat participants send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.is_chat_participant(chat_id, auth.uid()));

-- Deals
CREATE POLICY "Participants view deals" ON public.deals FOR SELECT TO authenticated USING (user_a = auth.uid() OR user_b = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Participants create deals" ON public.deals FOR INSERT TO authenticated WITH CHECK ((user_a = auth.uid() OR user_b = auth.uid()) AND proposed_by = auth.uid());
CREATE POLICY "Participants update deals" ON public.deals FOR UPDATE TO authenticated USING (user_a = auth.uid() OR user_b = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Deal participants create reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid());

-- Complaints
CREATE POLICY "Users view own complaints" ON public.complaints FOR SELECT TO authenticated USING (complainant_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create complaints" ON public.complaints FOR INSERT TO authenticated WITH CHECK (complainant_id = auth.uid());
CREATE POLICY "Admins update complaints" ON public.complaints FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete complaints" ON public.complaints FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ==========================================
-- SEED CATEGORIES
-- ==========================================
INSERT INTO public.categories (name) VALUES
  ('Художественная литература'),
  ('Научная литература'),
  ('Учебники'),
  ('Электроника'),
  ('Одежда'),
  ('Мебель'),
  ('Спорт'),
  ('Репетиторство'),
  ('Ремонт'),
  ('Дизайн'),
  ('Другое');

-- ==========================================
-- STORAGE BUCKETS
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('listings', 'listings', true);

CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users upload listing photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Anyone can view listing photos" ON storage.objects FOR SELECT USING (bucket_id = 'listings');
CREATE POLICY "Users delete own listing photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text);
