from datetime import datetime, timedelta, timezone
from typing import Any
import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher
from app.core.config import settings


class PasswordHasher:
    """
    Handles secure one-way password hashing and verification using modern algorithms.
    Supports both Argon2 and Bcrypt.
    """
    def __init__(self) -> None:
        self._hasher = PasswordHash((Argon2Hasher(), BcryptHasher()))

    def hash(self, password: str) -> str:
        """Hash a plain text password."""
        return self._hasher.hash(password)

    def verify(self, plain_password: str, hashed_password: str) -> bool:
        """Verify whether a plain text password matches a stored hash."""
        return self._hasher.verify(plain_password, hashed_password)


class TokenService:
    """
    Handles encoding, signing, and decoding of JSON Web Tokens (JWT).
    """
    def __init__(self, secret_key: str = settings.SECRET_KEY, algorithm: str = settings.ALGORITHM) -> None:
        self._secret_key = secret_key
        self._algorithm = algorithm

    def create_access_token(
        self,
        subject: str | int,
        claims: dict[str, Any] | None = None,
        expires_delta: timedelta | None = None
    ) -> str:
        """
        Creates a signed JWT access token.
        - subject ('sub'): identifies the user (user_id)
        - claims: custom data embedded in the token (school_id, active_membership_id, roles)
        - exp: expiration timestamp
        """
        now = datetime.now(timezone.utc)
        if expires_delta:
            expire = now + expires_delta
        else:
            expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

        payload: dict[str, Any] = {
            "sub": str(subject),
            "iat": int(now.timestamp()),
            "exp": int(expire.timestamp()),
        }

        if claims:
            payload.update(claims)

        return jwt.encode(payload, self._secret_key, algorithm=self._algorithm)

    def decode_token(self, token: str) -> dict[str, Any]:
        """
        Decodes and verifies the cryptographic signature of a JWT token.
        Raises jwt.PyJWTError if expired, tampered with, or invalid.
        """
        return jwt.decode(
            token,
            self._secret_key,
            algorithms=[self._algorithm]
        )


# Singleton instances for convenient dependency injection
password_hasher = PasswordHasher()
token_service = TokenService()

