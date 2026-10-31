import enum


class Role(str, enum.Enum):
    ADMIN = "ADMIN"
    GESTIONNAIRE = "GESTIONNAIRE"
