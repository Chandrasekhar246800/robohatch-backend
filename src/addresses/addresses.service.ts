import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createAddressDto: CreateAddressDto) {
    // If this is the first address, make it default
    const existingAddresses = await this.prisma.address.count({
      where: { userId },
    });

    return this.prisma.address.create({
      data: {
        ...createAddressDto,
        userId,
        isDefault: existingAddresses === 0,
      },
      select: {
        id: true,
        line1: true,
        line2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      select: {
        id: true,
        line1: true,
        line2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(addressId: string, userId: string) {
    const address = await this.prisma.address.findFirst({
      where: { 
        id: addressId,
        userId,
      },
      select: {
        id: true,
        line1: true,
        line2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async update(addressId: string, userId: string, updateAddressDto: UpdateAddressDto) {
    // Verify ownership FIRST - Critical security requirement
    const address = await this.prisma.address.findFirst({
      where: { 
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // Handle isDefault logic with transaction
    if (updateAddressDto.isDefault === true && !address.isDefault) {
      return this.prisma.$transaction(async (tx) => {
        // Remove default from all other addresses
        await tx.address.updateMany({
          where: { 
            userId,
            isDefault: true,
          },
          data: { isDefault: false },
        });

        // Set this address as default
        return tx.address.update({
          where: { id: addressId },
          data: updateAddressDto,
          select: {
            id: true,
            line1: true,
            line2: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
            isDefault: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      });
    }

    // Regular update without default change
    return this.prisma.address.update({
      where: { id: addressId },
      data: updateAddressDto,
      select: {
        id: true,
        line1: true,
        line2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(addressId: string, userId: string) {
    // Verify ownership FIRST - Critical security requirement
    const address = await this.prisma.address.findFirst({
      where: { 
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // If deleting default address, make another one default
    if (address.isDefault) {
      await this.prisma.$transaction(async (tx) => {
        // Delete the address
        await tx.address.delete({
          where: { id: addressId },
        });

        // Find the next address and make it default
        const nextAddress = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'asc' },
        });

        if (nextAddress) {
          await tx.address.update({
            where: { id: nextAddress.id },
            data: { isDefault: true },
          });
        }
      });
    } else {
      await this.prisma.address.delete({
        where: { id: addressId },
      });
    }

    return { message: 'Address deleted successfully' };
  }
}
